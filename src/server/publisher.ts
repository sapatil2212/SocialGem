import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pinterestBoardsFor, sendToLinkedIn, sendToPinterest, sendToX } from "./accounts";
import { fromPlatform, type TargetOptions } from "./data";
import { HttpError } from "./errors";
import { looksLikeVideo, publishOutcome, submitPublish } from "./muapi";

// The publishing engine. One rule above all: a post is never sent twice.
//
//  SCHEDULED --claim--> PUBLISHING --send--> PUBLISHED
//                           |  \--refused--> FAILED (certainly not posted)
//                           |  \--unclear--> NEEDS_CHECK (may have posted; a person decides)
//                           \--MuAPI accepted--> polled until PUBLISHED or FAILED
//
// Claims and every state change are conditional updates, so several workers (or a
// restart in the middle of a send) cannot send the same post twice. An attempt row is
// written *before* sending: if the worker dies after that, the post goes to NEEDS_CHECK.

const LEASE_MS = 10 * 60_000; // how long a claimed post may stay unsent before it is recovered
const LATE_MS = 6 * 3600_000; // after an outage, posts this late are held back, not sent as old news
const POLL_START_MS = 15_000;
const POLL_MAX_MS = 5 * 60_000;
const GIVE_UP_MS = 3 * 3600_000; // MuAPI never answered: a person checks the platform
const BATCH = 10;
const MUAPI_PLATFORMS = ["FACEBOOK", "INSTAGRAM", "YOUTUBE", "TIKTOK"];

const target = { include: { post: { include: { media: true } }, media: true, socialAccount: true } } satisfies Prisma.PostTargetDefaultArgs;
type Target = Prisma.PostTargetGetPayload<typeof target>;

type Result =
  | { kind: "published"; url: string | null; postId: string | null }
  | { kind: "accepted"; requestId: string }
  | { kind: "failed"; code: string; message: string }
  | { kind: "unclear"; code: string; message: string };

const short = (text: string, max: number) => ([...text].length > max ? [...text].slice(0, max - 1).join("") + "…" : text);
const mediaOf = (t: Target) => {
  const m = t.media ?? t.post.media;
  return m && !m.deletedAt ? m.sourceUrl ?? "" : "";
};

/** What the platform is sent. Per-channel captions win over the post's own caption. */
function partsOf(t: Target) {
  const options = (t.options ?? {}) as TargetOptions & { boardId?: string };
  const text = (t.caption ?? t.post.caption ?? "").trim();
  const title = (options.title ?? t.post.title ?? "").trim();
  const tags = (options.hashtags ?? "").split(/[\s,]+/).map((s) => s.replace(/^#/, "")).filter(Boolean).slice(0, 30);
  return { text, title, tags, options, media: mediaOf(t) };
}

/** Errors thrown by our own direct clients: 4xx means the platform refused, anything else is unclear. */
function judge(error: unknown): Result {
  if (error instanceof HttpError && error.status >= 400 && error.status < 500) return { kind: "failed", code: error.code.slice(0, 40), message: error.message };
  console.error("[publisher] unclear send", (error as Error)?.name, (error as Error)?.message);
  return { kind: "unclear", code: "UNCLEAR", message: "We lost contact while sending, so we cannot tell whether it was posted. Check the platform before trying again." };
}

async function send(t: Target): Promise<Result> {
  const account = t.socialAccount;
  if (!account || account.status !== "ACTIVE") return { kind: "failed", code: "ACCOUNT", message: "The account is not connected. Reconnect it in Channels, then schedule again." };
  const { text, title, tags, options, media } = partsOf(t);
  const platform = fromPlatform(t.platform);

  if (MUAPI_PLATFORMS.includes(t.platform)) {
    if (!account.muapiAccountId) return { kind: "failed", code: "ACCOUNT", message: "Reconnect this account in Channels, then schedule again." };
    const video = looksLikeVideo(media);
    const base = { account_id: account.muapiAccountId };
    const body: Record<string, unknown> =
      platform === "youtube"
        ? { ...base, media_url: media, title: short(title || text, 100), description: short(text, 5000), tags, privacy: options.privacy || "public", category_id: options.categoryId || "22", made_for_kids: Boolean(options.madeForKids) }
        : platform === "tiktok"
          ? { ...base, media_url: media, title: short(title || text, 150), privacy_level: "PUBLIC_TO_EVERYONE", disable_comment: Boolean(options.disableComment), disable_duet: Boolean(options.disableDuet), disable_stitch: Boolean(options.disableStitch) }
          : platform === "instagram"
            ? { ...base, media_url: media, caption: short(text, 2200), media_type: video ? "VIDEO" : "IMAGE", placement: video ? "reels" : "timeline", share_to_feed: true }
            : { ...base, caption: text, message: text, ...(media ? { media_url: media, media_type: video ? "VIDEO" : "IMAGE" } : {}) };
    const sent = await submitPublish(platform, body);
    if (sent.ok) return { kind: "accepted", requestId: sent.requestId };
    return sent.definite ? { kind: "failed", code: sent.code, message: sent.message } : { kind: "unclear", code: sent.code, message: sent.message };
  }

  try {
    if (t.platform === "X") {
      const out = await sendToX(t.workspaceId, account.id, text || title);
      return { kind: "published", url: out.url, postId: out.id };
    }
    if (t.platform === "LINKEDIN") {
      const out = await sendToLinkedIn(t.workspaceId, account.id, text || title);
      return { kind: "published", url: out.url, postId: out.id };
    }
    if (t.platform === "PINTEREST") {
      const boardId = options.boardId || (await pinterestBoardsFor(t.workspaceId, account.id))[0]?.id;
      if (!boardId) return { kind: "failed", code: "BOARD", message: "Create a board on Pinterest first, then schedule again." };
      const out = await sendToPinterest(t.workspaceId, account.id, { boardId, imageUrl: media, title: short(title || text, 100), description: short(text, 500) });
      return { kind: "published", url: out.url, postId: out.id };
    }
  } catch (error) {
    return judge(error);
  }
  return { kind: "failed", code: "PLATFORM_OFF", message: "This platform cannot be published to yet." };
}

/** Records how a send went. Every write checks the lease, so a recovered post is never overwritten. */
async function finish(t: Target, lease: string, attemptId: string, result: Result) {
  const now = new Date();
  const where = { id: t.id, status: "PUBLISHING" as const, leaseToken: lease };
  if (result.kind === "published") {
    await prisma.publishAttempt.update({ where: { id: attemptId }, data: { state: "SUCCEEDED", finishedAt: now } });
    await prisma.postTarget.updateMany({ where, data: { status: "PUBLISHED", publishedAt: now, publishedUrl: result.url, platformPostId: result.postId, claimAt: null, pollAt: null, leaseToken: null, errorCode: null, errorMessage: null } });
  } else if (result.kind === "accepted") {
    await prisma.publishAttempt.update({ where: { id: attemptId }, data: { state: "ACCEPTED", requestId: result.requestId } });
    await prisma.postTarget.updateMany({ where, data: { claimAt: null, pollAt: new Date(now.getTime() + POLL_START_MS) } });
  } else {
    const failed = result.kind === "failed";
    await prisma.publishAttempt.update({ where: { id: attemptId }, data: { state: failed ? "FAILED" : "AMBIGUOUS", errorCode: result.code, errorMessage: result.message, finishedAt: now } });
    await prisma.postTarget.updateMany({ where, data: { status: failed ? "FAILED" : "NEEDS_CHECK", errorCode: result.code, errorMessage: result.message, claimAt: null, pollAt: null, leaseToken: null } });
  }
}

/** Sends posts that are due. Returns how many it claimed. */
export async function publishDue(now = new Date(), limit = BATCH) {
  // Long overdue (the server was down): hold back instead of posting old news.
  await prisma.postTarget.updateMany({
    where: { status: "SCHEDULED", claimAt: { lte: new Date(now.getTime() - LATE_MS) } },
    data: { status: "FAILED", claimAt: null, errorCode: "LATE", errorMessage: "Not posted: it was more than 6 hours late because the service was down. Schedule it again if it still makes sense." },
  });
  const due = await prisma.postTarget.findMany({ where: { status: "SCHEDULED", claimAt: { lte: now } }, orderBy: { claimAt: "asc" }, take: limit, select: { id: true } });
  let claimed = 0;
  for (const { id } of due) {
    const lease = randomUUID();
    const won = await prisma.postTarget.updateMany({
      where: { id, status: "SCHEDULED", claimAt: { lte: now } },
      data: { status: "PUBLISHING", leaseToken: lease, claimAt: new Date(now.getTime() + LEASE_MS), attemptCount: { increment: 1 } },
    });
    if (!won.count) continue; // another worker has it
    claimed++;
    const t = await prisma.postTarget.findUniqueOrThrow({ where: { id }, ...target });
    // Written before sending: from here on, a crash means "may have posted".
    const attempt = await prisma.publishAttempt.create({ data: { targetId: id, number: t.attemptCount } });
    let result: Result;
    try {
      result = await send(t);
    } catch (error) {
      result = judge(error);
    }
    await finish(t, lease, attempt.id, result);
  }
  return claimed;
}

/** Asks MuAPI how accepted sends went. */
export async function pollAccepted(now = new Date(), limit = BATCH) {
  const waiting = await prisma.postTarget.findMany({ where: { status: "PUBLISHING", pollAt: { lte: now } }, orderBy: { pollAt: "asc" }, take: limit, select: { id: true, pollAt: true, attemptCount: true } });
  for (const row of waiting) {
    const attempt = await prisma.publishAttempt.findUnique({ where: { targetId_number: { targetId: row.id, number: row.attemptCount } } });
    if (!attempt?.requestId || attempt.state !== "ACCEPTED") continue;
    const age = now.getTime() - attempt.sentAt.getTime();
    const next = new Date(now.getTime() + Math.min(POLL_MAX_MS, Math.max(POLL_START_MS, age / 4)));
    // Claim this poll so two workers do not both handle it.
    const mine = await prisma.postTarget.updateMany({ where: { id: row.id, status: "PUBLISHING", pollAt: row.pollAt }, data: { pollAt: next } });
    if (!mine.count) continue;
    const outcome = await publishOutcome(attempt.requestId);
    const where = { id: row.id, status: "PUBLISHING" as const, pollAt: next };
    if (outcome.status === "completed") {
      await prisma.publishAttempt.update({ where: { id: attempt.id }, data: { state: "SUCCEEDED", finishedAt: now, resultCostUsd: 0.01 } });
      await prisma.postTarget.updateMany({ where, data: { status: "PUBLISHED", publishedAt: now, publishedUrl: outcome.url, platformPostId: outcome.postId, pollAt: null, leaseToken: null, errorCode: null, errorMessage: null } });
    } else if (outcome.status === "failed") {
      await prisma.publishAttempt.update({ where: { id: attempt.id }, data: { state: "FAILED", errorCode: "REFUSED", errorMessage: outcome.message, finishedAt: now } });
      await prisma.postTarget.updateMany({ where, data: { status: "FAILED", errorCode: "REFUSED", errorMessage: outcome.message, pollAt: null, leaseToken: null } });
    } else if (age > GIVE_UP_MS) {
      const message = "The social service has not confirmed this post after 3 hours. Check the platform before trying again.";
      await prisma.publishAttempt.update({ where: { id: attempt.id }, data: { state: "AMBIGUOUS", errorCode: "NO_ANSWER", errorMessage: message, finishedAt: now } });
      await prisma.postTarget.updateMany({ where, data: { status: "NEEDS_CHECK", errorCode: "NO_ANSWER", errorMessage: message, pollAt: null, leaseToken: null } });
    }
  }
}

/** Posts whose worker stopped mid-way. Unsent ones go back in the queue; possibly sent ones wait for a person. */
export async function recoverStuck(now = new Date()) {
  const stuck = await prisma.postTarget.findMany({ where: { status: "PUBLISHING", pollAt: null, claimAt: { lt: now } }, take: 50, select: { id: true, leaseToken: true, attemptCount: true } });
  for (const t of stuck) {
    const attempt = await prisma.publishAttempt.findUnique({ where: { targetId_number: { targetId: t.id, number: t.attemptCount } } });
    const where = { id: t.id, status: "PUBLISHING" as const, leaseToken: t.leaseToken };
    if (!attempt) {
      // Claimed, but nothing was sent: safe to try again now.
      await prisma.postTarget.updateMany({ where, data: { status: "SCHEDULED", claimAt: now, leaseToken: null, attemptCount: { decrement: 1 } } });
    } else if (attempt.state === "SENDING") {
      const message = "The server restarted while sending, so we cannot tell whether it was posted. Check the platform before trying again.";
      await prisma.publishAttempt.update({ where: { id: attempt.id }, data: { state: "AMBIGUOUS", errorCode: "INTERRUPTED", errorMessage: message, finishedAt: now } });
      await prisma.postTarget.updateMany({ where, data: { status: "NEEDS_CHECK", errorCode: "INTERRUPTED", errorMessage: message, claimAt: null, leaseToken: null } });
    } else if (attempt.state === "ACCEPTED") {
      // MuAPI took it; only the follow-up was lost. Keep asking how it went.
      await prisma.postTarget.updateMany({ where, data: { claimAt: null, pollAt: now } });
    } else if (attempt.state === "SUCCEEDED") {
      await prisma.postTarget.updateMany({ where, data: { status: "PUBLISHED", publishedAt: attempt.finishedAt ?? now, claimAt: null, leaseToken: null, errorCode: null, errorMessage: null } });
    } else {
      const failed = attempt.state === "FAILED";
      await prisma.postTarget.updateMany({ where, data: { status: failed ? "FAILED" : "NEEDS_CHECK", errorCode: attempt.errorCode, errorMessage: attempt.errorMessage, claimAt: null, leaseToken: null } });
    }
  }
}

let running = false;
/** One pass of the worker. Never runs twice at once in the same process. */
export async function tick(now = new Date()) {
  if (running) return;
  running = true;
  try {
    await recoverStuck(now);
    await publishDue(now);
    await pollAccepted(now);
  } catch (error) {
    console.error("[publisher]", (error as Error)?.message);
  } finally {
    running = false;
  }
}

const KEY = Symbol.for("socialgem.publisher");
type Holder = { [KEY]?: ReturnType<typeof setInterval> };

/** Started once per server process by instrumentation.ts. */
export function startPublisher(everyMs = 15_000) {
  const g = globalThis as Holder;
  if (g[KEY]) return;
  g[KEY] = setInterval(() => void tick(), everyMs);
  g[KEY].unref?.();
  console.log("[publisher] started");
  void tick();
}

/** Runs a pass straight away (for Publish now), if this process runs the worker. */
export function nudgePublisher() {
  if ((globalThis as Holder)[KEY]) void tick();
}

export const publisherEnabled = () =>
  process.env.PUBLISHER ? process.env.PUBLISHER === "on" : process.env.NODE_ENV === "production";
