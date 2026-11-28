import { createHash, randomBytes } from "node:crypto";
import type { SocialAccount } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dataFor, fromPlatform, toPlatform } from "./data";
import { signedOut, type DirectProvider, type DirectTokens, type DirectUser } from "./direct";
import { HttpError, isUniqueClash } from "./errors";
import { linkedinCreatePost, linkedinProvider } from "./linkedin";
import { connectUrl, muapiReady, platformKey, remoteAccounts, type RemoteAccount } from "./muapi";
import { openTokens, sealTokens } from "./tokens";
import type { CurrentWorkspace } from "./workspaces";
import { pkceVerifier, xCreatePost, xProvider } from "./x";

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
  // Direct connections (X, LinkedIn) are not held by MuAPI, so MuAPI must not judge them.
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
  const direct = directProvider(platform);
  if (direct) return startDirectConnect(direct, workspace, userId);
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

// ---- Direct connections (X, LinkedIn): each customer's own sign-in, not MuAPI ----

const DIRECT: Record<string, DirectProvider> = { x: xProvider, linkedin: linkedinProvider };
export const directProvider = (key: string) => DIRECT[platformKey(key)];
const STATE = /^[\w-]{32}$/;

async function startDirectConnect(provider: DirectProvider, workspace: CurrentWorkspace, userId: string) {
  if (!provider.ready()) throw new HttpError(400, "PLATFORM_OFF", "That platform is not available yet.");
  const state = randomBytes(24).toString("base64url");
  const verifier = pkceVerifier();
  const attempt = await prisma.connectAttempt.create({
    data: { workspaceId: workspace.id, userId, platform: provider.platform, nonceHash: hash(state), knownAccounts: [], codeVerifier: verifier, expiresAt: new Date(Date.now() + 15 * 60_000) },
  });
  return { url: provider.authorizeUrl(state, verifier), attempt: attempt.id };
}

/** Same rules as finishConnect: only the person who started, only once. code is null when they said no. */
export async function finishDirectConnect(providerKey: string, userId: string, state: string, code: string | null): Promise<{ result: ConnectResult; workspaceId?: string }> {
  const provider = directProvider(providerKey);
  if (!provider || !STATE.test(state)) return { result: "expired" };
  const attempt = await prisma.connectAttempt.findUnique({ where: { nonceHash: hash(state) }, include: { workspace: { select: { archivedAt: true, members: { where: { userId }, select: { role: true } } } } } });
  if (!attempt || attempt.platform !== provider.platform || attempt.userId !== userId || attempt.workspace.archivedAt || !attempt.workspace.members.length) return { result: "expired" };
  const claimed = await prisma.connectAttempt.updateMany({ where: { id: attempt.id, status: "PENDING", expiresAt: { gt: new Date() } }, data: { status: "FAILED", error: "working", codeVerifier: null } });
  if (!claimed.count || !attempt.codeVerifier) return { result: "expired" };
  if (!code) {
    await prisma.connectAttempt.update({ where: { id: attempt.id }, data: { error: "none" } });
    return { result: "none", workspaceId: attempt.workspaceId };
  }
  try {
    const tokens = await provider.exchange(code, attempt.codeVerifier);
    const user = await provider.me(tokens.access);
    const result = await adoptDirect(provider, attempt.workspaceId, user, tokens);
    await prisma.connectAttempt.update({ where: { id: attempt.id }, data: result === "added" ? { status: "COMPLETED", error: null } : { error: "taken" } });
    return { result: result === "added" ? "connected" : "taken", workspaceId: attempt.workspaceId };
  } catch (error) {
    await prisma.connectAttempt.update({ where: { id: attempt.id }, data: { error: "provider" } });
    throw error;
  }
}

async function adoptDirect(provider: DirectProvider, workspaceId: string, user: DirectUser, tokens: DirectTokens): Promise<"added" | "taken"> {
  const data = {
    name: user.name, platformUserId: user.id, claimKey: `${provider.key}:${user.id}`, avatarUrl: user.avatarUrl,
    tokenCipher: sealTokens(tokens), tokenExpiresAt: new Date(tokens.expiresAt),
    status: "ACTIVE" as const, connectedAt: new Date(), disconnectedAt: null, lastCheckedAt: new Date(),
  };
  try {
    const own = await prisma.socialAccount.updateMany({ where: { workspaceId, claimKey: data.claimKey }, data });
    if (!own.count) await prisma.socialAccount.create({ data: { ...data, workspaceId, platform: provider.platform } });
    return "added";
  } catch (error) {
    if (isUniqueClash(error)) return "taken";
    throw error;
  }
}

/** A working token for one directly connected account, refreshed (and saved) when it is about to run out. */
export async function directAccessToken(workspaceId: string, accountId: string, tries = 0): Promise<{ access: string; memberId: string }> {
  const account = await prisma.socialAccount.findFirst({ where: { id: accountId, workspaceId, platform: { in: ["X", "LINKEDIN"] } }, select: { id: true, platform: true, status: true, tokenCipher: true, platformUserId: true } });
  if (!account?.tokenCipher || account.status !== "ACTIVE") throw new HttpError(400, "ACCOUNT", "Choose a connected account.");
  const provider = directProvider(fromPlatform(account.platform))!;
  const memberId = account.platformUserId ?? "";
  const tokens = openTokens<DirectTokens>(account.tokenCipher);
  if (tokens.expiresAt > Date.now() + 5 * 60_000) return { access: tokens.access, memberId };
  if (!tokens.refresh || !provider.refresh) return markSignedOut(provider, workspaceId, account.id);
  let fresh: DirectTokens;
  try {
    fresh = await provider.refresh(tokens.refresh);
  } catch (error) {
    if (error instanceof HttpError && error.code === "SIGNED_OUT") return markSignedOut(provider, workspaceId, account.id);
    throw error;
  }
  // X replaces the refresh token on every use, so the new one must be saved.
  const saved = await prisma.socialAccount.updateMany({
    where: { id: account.id, workspaceId, tokenCipher: account.tokenCipher },
    data: { tokenCipher: sealTokens({ ...fresh, refresh: fresh.refresh ?? tokens.refresh }), tokenExpiresAt: new Date(fresh.expiresAt), lastCheckedAt: new Date() },
  });
  if (!saved.count && tries < 2) return directAccessToken(workspaceId, accountId, tries + 1); // Another request refreshed it first.
  return { access: fresh.access, memberId };
}

async function markSignedOut(provider: DirectProvider, workspaceId: string, accountId: string): Promise<never> {
  await prisma.socialAccount.updateMany({ where: { id: accountId, workspaceId, status: "ACTIVE" }, data: { status: "NEEDS_RECONNECT", lastCheckedAt: new Date() } });
  throw signedOut(provider.label);
}

/** Sends one post to X now. For the publishing engine (M4); no route calls it yet. */
export async function sendToX(workspaceId: string, accountId: string, text: string) {
  if (!text.trim()) throw new HttpError(400, "EMPTY", "X needs some text.");
  if ([...text].length > 280) throw new HttpError(400, "TOO_LONG", "Keep X posts to 280 characters.");
  return xCreatePost((await directAccessToken(workspaceId, accountId)).access, text);
}

/** Sends one post to a LinkedIn profile now. For the publishing engine (M4); no route calls it yet. */
export async function sendToLinkedIn(workspaceId: string, accountId: string, text: string) {
  if (!text.trim()) throw new HttpError(400, "EMPTY", "LinkedIn needs some text.");
  if ([...text].length > 3000) throw new HttpError(400, "TOO_LONG", "Keep LinkedIn posts to 3,000 characters.");
  const { access, memberId } = await directAccessToken(workspaceId, accountId);
  return linkedinCreatePost(access, memberId, text);
}
