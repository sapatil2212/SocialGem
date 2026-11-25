import { createHash, randomBytes } from "node:crypto";
import type { SocialAccount } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dataFor, fromPlatform, toPlatform } from "./data";
import { isUniqueClash } from "./errors";
import { connectUrl, muapiReady, platformKey, remoteAccounts, type RemoteAccount } from "./muapi";
import type { CurrentWorkspace } from "./workspaces";

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
  const stale = known.some((a) => !a.lastCheckedAt || a.lastCheckedAt.getTime() < Date.now() - maxAgeSeconds * 1000);
  if (!stale || !muapiReady()) return known;
  const remote = await remoteAccounts(workspace.externalUserId).catch(() => null);
  if (!remote) return known;
  for (const a of known) {
    const found = remote.find((r) => r.id === a.muapiAccountId);
    await prisma.socialAccount.updateMany({
      where: { id: a.id, workspaceId: workspace.id, status: { not: "DISCONNECTED" } },
      data: { status: found?.connected ? "ACTIVE" : "NEEDS_RECONNECT", lastCheckedAt: new Date() },
    });
  }
  return accounts.list();
}

export async function startConnect(workspace: CurrentWorkspace, userId: string, platform: string) {
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
