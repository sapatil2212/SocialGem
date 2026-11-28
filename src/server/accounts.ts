import { createHash, randomBytes } from "node:crypto";
import type { SocialAccount } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dataFor, fromPlatform, toPlatform } from "./data";
import { HttpError, isUniqueClash } from "./errors";
import { connectUrl, muapiReady, platformKey, remoteAccounts, type RemoteAccount } from "./muapi";
import { openTokens, sealTokens } from "./tokens";
import type { CurrentWorkspace } from "./workspaces";
import { pkceVerifier, xAuthorizeUrl, xCreatePost, xExchangeCode, xMe, xReady, xRefresh, type XTokens, type XUser } from "./x";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const claimKey = (a: RemoteAccount) => (a.platformUserId ? `${a.platform}:${a.platformUserId}` : `muapi:${a.id}`);

export const showAccount = (a: SocialAccount) => ({
  id: a.id,
  platform_name: fromPlatform(a.platform),
  account_name: a.name,
  status: a.status,
  connected: a.status === "ACTIVE",
  connected_at: a.connectedAt,
});

/** Refreshes the status of accounts we already hold. Never adds one: that needs a connect flow. */
export async function syncAccounts(workspace: CurrentWorkspace, maxAgeSeconds = 300) {
  const { accounts } = dataFor(workspace.id);
  const known = await accounts.list();
  // Direct connections (X) are not held by MuAPI, so MuAPI must not judge them.
  const viaMuapi = known.filter((a) => a.muapiAccountId !== null);
  const stale = viaMuapi.some((a) => !a.lastCheckedAt || a.lastCheckedAt.getTime() < Date.now() - maxAgeSeconds * 1000);
  if (!stale || !muapiReady()) return known;
  // (Switched-off accounts are not listed here, so a refresh never turns them back on.)
  const remote = await remoteAccounts(workspace.externalUserId).catch(() => null);
  if (!remote) return known;
  for (const a of viaMuapi) {
    const found = remote.find((r) => r.id === a.muapiAccountId);
    await prisma.socialAccount.updateMany({
      where: { id: a.id, workspaceId: workspace.id, status: { not: "DISCONNECTED" } },
      data: { status: found?.connected ? "ACTIVE" : "NEEDS_RECONNECT", lastCheckedAt: new Date() },
    });
  }
  return accounts.list();
}

export async function startConnect(workspace: CurrentWorkspace, userId: string, platform: string) {
  if (platformKey(platform) === "x") return startXConnect(workspace, userId);
  const nonce = randomBytes(24).toString("base64url");
  const base = (process.env.APP_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  const before = await remoteAccounts(workspace.externalUserId);
  const url = await connectUrl(workspace.externalUserId, platform, `${base}/connect/callback/${nonce}`);
  const attempt = await prisma.connectAttempt.create({
    data: {
      workspaceId: workspace.id, userId, platform: toPlatform(platform), nonceHash: hash(nonce),
      // Only those connected now, so that both new and restored connections stand out later.
      knownAccounts: before.filter((a) => a.connected).map((a) => a.id), expiresAt: new Date(Date.now() + 15 * 60_000),
    },
  });
  return { url, attempt: attempt.id };
}

/** What the waiting page may know about its own attempt. Never changes anything. */
export async function attemptResult(workspaceId: string, userId: string, id: string): Promise<ConnectResult | "waiting" | "failed" | null> {
  const attempt = await prisma.connectAttempt.findFirst({ where: { id, workspaceId, userId }, select: { status: true, error: true, expiresAt: true } });
  if (!attempt) return null;
  if (attempt.status === "COMPLETED") return "connected";
  if (attempt.status === "FAILED" && attempt.error === "working") return attempt.expiresAt < new Date() ? "failed" : "waiting";
  if (attempt.status === "FAILED") return attempt.error === "none" || attempt.error === "taken" ? attempt.error : "failed";
  return attempt.expiresAt < new Date() ? "expired" : "waiting";
}

async function adopt(workspaceId: string, a: RemoteAccount): Promise<"added" | "taken"> {
  const data = {
    name: a.name, platformUserId: a.platformUserId, muapiAccountId: a.id, claimKey: claimKey(a), status: "ACTIVE" as const,
    connectedAt: new Date(), disconnectedAt: null, lastCheckedAt: new Date(),
  };
  try {
    const own = await prisma.socialAccount.updateMany({ where: { workspaceId, OR: [{ muapiAccountId: a.id }, { claimKey: claimKey(a) }] }, data });
    if (!own.count) await prisma.socialAccount.create({ data: { ...data, workspaceId, platform: toPlatform(a.platform) } });
    return "added";
  } catch (error) {
    if (isUniqueClash(error)) return "taken";
    throw error;
  }
}

export type ConnectResult = "connected" | "taken" | "none" | "expired";

/** Only the person who started, only once, and only accounts that appeared during this attempt. */
export async function finishConnect(userId: string, nonce: string): Promise<{ result: ConnectResult; workspaceId?: string }> {
  const attempt = await prisma.connectAttempt.findUnique({ where: { nonceHash: hash(nonce) }, include: { workspace: { select: { externalUserId: true, archivedAt: true, members: { where: { userId }, select: { role: true } } } } } });
  if (!attempt || attempt.userId !== userId || attempt.workspace.archivedAt || !attempt.workspace.members.length) return { result: "expired" };
  const claimed = await prisma.connectAttempt.updateMany({ where: { id: attempt.id, status: "PENDING", expiresAt: { gt: new Date() } }, data: { status: "FAILED", error: "working" } });
  if (!claimed.count) return { result: "expired" };

  try {
    const before = new Set(Array.isArray(attempt.knownAccounts) ? attempt.knownAccounts : []);
    const fresh = (await remoteAccounts(attempt.workspace.externalUserId)).filter(
      (a) => a.connected && a.platform === platformKey(attempt.platform) && !before.has(a.id)
    );
    const results = [];
    for (const account of fresh) results.push(await adopt(attempt.workspaceId, account));
    const result: ConnectResult = results.includes("added") ? "connected" : results.includes("taken") ? "taken" : "none";
    await prisma.connectAttempt.update({ where: { id: attempt.id }, data: result === "connected" ? { status: "COMPLETED" } : { status: "FAILED", error: result } });
    return { result, workspaceId: attempt.workspaceId };
  } catch (error) {
    await prisma.connectAttempt.update({ where: { id: attempt.id }, data: { status: "FAILED", error: "provider" } });
    throw error;
  }
}

// ---- X: connected directly with each customer's own X sign-in ----

const X_STATE = /^[\w-]{32}$/;

async function startXConnect(workspace: CurrentWorkspace, userId: string) {
  if (!xReady()) throw new HttpError(400, "PLATFORM_OFF", "That platform is not available yet.");
  const state = randomBytes(24).toString("base64url");
  const verifier = pkceVerifier();
  const attempt = await prisma.connectAttempt.create({
    data: { workspaceId: workspace.id, userId, platform: "X", nonceHash: hash(state), knownAccounts: [], codeVerifier: verifier, expiresAt: new Date(Date.now() + 15 * 60_000) },
  });
  return { url: xAuthorizeUrl(state, verifier), attempt: attempt.id };
}

/** Same rules as finishConnect: only the person who started, only once. code is null when they said no on X. */
export async function finishXConnect(userId: string, state: string, code: string | null): Promise<{ result: ConnectResult; workspaceId?: string }> {
  if (!X_STATE.test(state)) return { result: "expired" };
  const attempt = await prisma.connectAttempt.findUnique({ where: { nonceHash: hash(state) }, include: { workspace: { select: { archivedAt: true, members: { where: { userId }, select: { role: true } } } } } });
  if (!attempt || attempt.platform !== "X" || attempt.userId !== userId || attempt.workspace.archivedAt || !attempt.workspace.members.length) return { result: "expired" };
  const claimed = await prisma.connectAttempt.updateMany({ where: { id: attempt.id, status: "PENDING", expiresAt: { gt: new Date() } }, data: { status: "FAILED", error: "working", codeVerifier: null } });
  if (!claimed.count || !attempt.codeVerifier) return { result: "expired" };
  if (!code) {
    await prisma.connectAttempt.update({ where: { id: attempt.id }, data: { error: "none" } });
    return { result: "none", workspaceId: attempt.workspaceId };
  }
  try {
    const tokens = await xExchangeCode(code, attempt.codeVerifier);
    const user = await xMe(tokens.access);
    const result = await adoptX(attempt.workspaceId, user, tokens);
    await prisma.connectAttempt.update({ where: { id: attempt.id }, data: result === "added" ? { status: "COMPLETED", error: null } : { error: "taken" } });
    return { result: result === "added" ? "connected" : "taken", workspaceId: attempt.workspaceId };
  } catch (error) {
    await prisma.connectAttempt.update({ where: { id: attempt.id }, data: { error: "provider" } });
    throw error;
  }
}

async function adoptX(workspaceId: string, user: XUser, tokens: XTokens): Promise<"added" | "taken"> {
  const data = {
    name: `@${user.username}`, platformUserId: user.id, claimKey: `x:${user.id}`, avatarUrl: user.avatarUrl,
    tokenCipher: sealTokens(tokens), tokenExpiresAt: new Date(tokens.expiresAt),
    status: "ACTIVE" as const, connectedAt: new Date(), disconnectedAt: null, lastCheckedAt: new Date(),
  };
  try {
    const own = await prisma.socialAccount.updateMany({ where: { workspaceId, claimKey: data.claimKey }, data });
    if (!own.count) await prisma.socialAccount.create({ data: { ...data, workspaceId, platform: "X" } });
    return "added";
  } catch (error) {
    if (isUniqueClash(error)) return "taken";
    throw error;
  }
}

/** A working X token for one account, refreshed (and saved) when it is about to run out. */
export async function xAccessToken(workspaceId: string, accountId: string, tries = 0): Promise<string> {
  const account = await prisma.socialAccount.findFirst({ where: { id: accountId, workspaceId, platform: "X" }, select: { id: true, status: true, tokenCipher: true } });
  if (!account?.tokenCipher || account.status !== "ACTIVE") throw new HttpError(400, "ACCOUNT", "Choose a connected X account.");
  const tokens = openTokens<XTokens>(account.tokenCipher);
  if (tokens.expiresAt > Date.now() + 5 * 60_000) return tokens.access;
  if (!tokens.refresh) return markXSignedOut(workspaceId, account.id);
  let fresh: XTokens;
  try {
    fresh = await xRefresh(tokens.refresh);
  } catch (error) {
    if (error instanceof HttpError && error.code === "X_SIGNED_OUT") return markXSignedOut(workspaceId, account.id);
    throw error;
  }
  // X replaces the refresh token on every use, so the new one must be saved.
  const saved = await prisma.socialAccount.updateMany({
    where: { id: account.id, workspaceId, tokenCipher: account.tokenCipher },
    data: { tokenCipher: sealTokens({ ...fresh, refresh: fresh.refresh ?? tokens.refresh }), tokenExpiresAt: new Date(fresh.expiresAt), lastCheckedAt: new Date() },
  });
  if (!saved.count && tries < 2) return xAccessToken(workspaceId, accountId, tries + 1); // Another request refreshed it first.
  return fresh.access;
}

async function markXSignedOut(workspaceId: string, accountId: string): Promise<never> {
  await prisma.socialAccount.updateMany({ where: { id: accountId, workspaceId, status: "ACTIVE" }, data: { status: "NEEDS_RECONNECT", lastCheckedAt: new Date() } });
  throw new HttpError(401, "X_SIGNED_OUT", "X has signed this account out. Please reconnect it.");
}

/** Sends one post to X now. For the publishing engine (M4); no route calls it yet. */
export async function sendToX(workspaceId: string, accountId: string, text: string) {
  if (!text.trim()) throw new HttpError(400, "EMPTY", "X needs some text.");
  if ([...text].length > 280) throw new HttpError(400, "TOO_LONG", "Keep X posts to 280 characters.");
  return xCreatePost(await xAccessToken(workspaceId, accountId), text);
}
