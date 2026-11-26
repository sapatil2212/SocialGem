import { randomUUID } from "node:crypto";
import type { MediaAsset, Platform, Prisma, TargetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError, isUniqueClash } from "./errors";

// The only way for API routes to reach customer data. Every query carries the
// workspace, so another workspace's id behaves like one that does not exist.
const EDITABLE: TargetStatus[] = ["DRAFT", "SCHEDULED", "FAILED"];
const REMOVABLE: TargetStatus[] = ["DRAFT", "SCHEDULED", "CANCELLED", "FAILED"];

export const isEditable = (status: TargetStatus) => EDITABLE.includes(status);
export const toPlatform = (key: string) => (key === "x_twitter" ? "X" : key.toUpperCase()) as Platform;
export const fromPlatform = (p: Platform) => (p === "X" ? "x_twitter" : p.toLowerCase());

// Names the current dashboard understands.
const STATUS: Record<TargetStatus, string> = {
  DRAFT: "draft", SCHEDULED: "scheduled", QUEUED: "processing", PUBLISHING: "processing",
  PUBLISHED: "completed", FAILED: "failed", CANCELLED: "cancelled", NEEDS_CHECK: "needs_check",
};

const include = { media: true, socialAccount: true, post: { include: { media: true, tag: true } } } satisfies Prisma.PostTargetInclude;
type Full = Prisma.PostTargetGetPayload<{ include: typeof include }>;
export type TargetOptions = { title?: string; hashtags?: string; privacy?: string; categoryId?: string | null; madeForKids?: boolean; disableComment?: boolean; disableDuet?: boolean; disableStitch?: boolean };

const mediaLink = (m: MediaAsset | null) => (m && !m.deletedAt ? (m.sourceUrl ?? (m.objectKey && process.env.MEDIA_PUBLIC_URL ? `${process.env.MEDIA_PUBLIC_URL}/${m.objectKey}` : "")) : "");

function showTarget(t: Full) {
  const options = (t.options ?? {}) as TargetOptions;
  return {
    id: t.id,
    postId: t.postId,
    platform: fromPlatform(t.platform),
    accountId: t.socialAccountId,
    channelId: t.socialAccountId,
    accountName: t.socialAccount?.name ?? "No account chosen",
    title: options.title ?? t.post.title ?? "",
    description: t.caption ?? t.post.caption,
    tags: options.hashtags ?? "",
    mediaUrl: mediaLink(t.media ?? t.post.media),
    customTag: t.post.tag?.name ?? null,
    tagColor: t.post.tag?.color ?? null,
    privacy: options.privacy ?? "public",
    scheduledAt: t.scheduledAt ?? t.createdAt,
    status: STATUS[t.status],
    publishedUrl: t.publishedUrl,
    error: t.errorMessage,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

const VIDEO = /\.(mp4|mov|webm|m4v)(\?|#|$)/i;

function showMedia(m: MediaAsset) {
  return {
    id: m.id, name: m.name, url: mediaLink(m), type: m.mimeType.startsWith("video/") ? "video" : "image", mimeType: m.mimeType,
    size: m.sizeBytes, width: m.width, height: m.height, folder: m.folder, tags: m.tags ?? "", createdAt: m.createdAt,
  };
}

type MediaInput = { name: string; url: string; type?: string; size?: number | null; width?: number | null; height?: number | null; folder?: string; tags?: string };
type TargetInput = { platform: string; socialAccountId: string | null; caption: string | null; mediaUrl: string; options: TargetOptions };
type NewPost = { createdById: string; requestKey?: string; title: string; caption: string; mediaUrl: string; tag: { name: string; color: string } | null; scheduledAt: Date | null; draft: boolean; targets: TargetInput[] };

export function dataFor(workspaceId: string) {
  type Tx = Prisma.TransactionClient;

  async function mediaFor(tx: Tx, url: string) {
    if (!url) return null;
    const found = await tx.mediaAsset.findFirst({ where: { workspaceId, sourceUrl: url, deletedAt: null }, select: { id: true } });
    if (found) return found.id;
    const name = decodeURIComponent(new URL(url).pathname.split("/").pop() || "").slice(0, 190) || "Linked media";
    const made = await tx.mediaAsset.create({
      data: { workspaceId, sourceUrl: url, name, mimeType: VIDEO.test(url) ? "video/mp4" : "image/jpeg", sizeBytes: 0, folder: "Post Uploads", status: "READY" },
    });
    return made.id;
  }

  async function tagFor(tx: Tx, tag: NewPost["tag"]) {
    if (!tag) return null;
    return (await tx.postTag.upsert({ where: { workspaceId_name: { workspaceId, name: tag.name } }, create: { workspaceId, ...tag }, update: {} })).id;
  }

  const one = async (id: string) => prisma.postTarget.findFirst({ where: { id, workspaceId }, include });

  return {
    posts: {
      list: async (from?: Date, to?: Date) => {
        const range = from || to ? { OR: [{ scheduledAt: { gte: from, lte: to } }, { scheduledAt: null }] } : {};
        const rows = await prisma.postTarget.findMany({ where: { workspaceId, ...range }, include, orderBy: [{ scheduledAt: "desc" }, { id: "desc" }], take: 1000 });
        return rows.map(showTarget);
      },
      published: async (from: Date, to: Date) => {
        const rows = await prisma.postTarget.findMany({ where: { workspaceId, status: "PUBLISHED", publishedAt: { gte: from, lte: to } }, include, orderBy: { publishedAt: "desc" }, take: 2000 });
        return rows.map((r) => ({ ...showTarget(r), publishedAt: r.publishedAt! }));
      },
      raw: one,
      show: showTarget,
      create: async (input: NewPost) => {
        const requestKey = input.requestKey ?? randomUUID();
        try {
          const id = await prisma.$transaction(async (tx) => {
            const mediaId = await mediaFor(tx, input.mediaUrl);
            const tagId = await tagFor(tx, input.tag);
            const post = await tx.post.create({
              data: { workspaceId, createdById: input.createdById, requestKey, title: input.title || null, caption: input.caption, mediaId, tagId, scheduledAt: input.scheduledAt },
            });
            for (const t of input.targets) {
              await tx.postTarget.create({
                data: {
                  workspaceId, postId: post.id, platform: toPlatform(t.platform), socialAccountId: t.socialAccountId, caption: t.caption,
                  mediaId: t.mediaUrl && t.mediaUrl !== input.mediaUrl ? await mediaFor(tx, t.mediaUrl) : null,
                  options: t.options, status: input.draft ? "DRAFT" : "SCHEDULED", scheduledAt: input.scheduledAt, claimAt: input.draft ? null : input.scheduledAt,
                },
              });
            }
            return post.id;
          });
          return (await prisma.postTarget.findMany({ where: { workspaceId, postId: id }, include })).map(showTarget);
        } catch (error) {
          // The same request sent twice returns the first result.
          if (!isUniqueClash(error) || !input.requestKey) throw error;
          const rows = await prisma.postTarget.findMany({ where: { workspaceId, post: { requestKey } }, include });
          if (!rows.length) throw error;
          return rows.map(showTarget);
        }
      },
      update: async (current: Full, change: { title?: string; caption?: string; hashtags?: string; mediaUrl?: string; options?: TargetOptions; tag?: NewPost["tag"]; socialAccountId?: string; scheduledAt: Date | null; status: "DRAFT" | "SCHEDULED" }) => {
        const ok = await prisma.$transaction(async (tx) => {
          const options: TargetOptions = { ...((current.options ?? {}) as TargetOptions), ...change.options };
          if (change.title !== undefined) options.title = change.title;
          if (change.hashtags !== undefined) options.hashtags = change.hashtags;
          // The status check is part of the write, so a race cannot reopen a sent post.
          const { count } = await tx.postTarget.updateMany({
            where: { id: current.id, workspaceId, status: { in: EDITABLE } },
            data: {
              options, caption: change.caption, socialAccountId: change.socialAccountId, scheduledAt: change.scheduledAt, status: change.status,
              claimAt: change.status === "SCHEDULED" ? change.scheduledAt : null, errorCode: null, errorMessage: null,
              ...(change.mediaUrl !== undefined ? { mediaId: await mediaFor(tx, change.mediaUrl) } : {}),
            },
          });
          if (!count) return false;
          if (change.mediaUrl === "") await tx.post.updateMany({ where: { id: current.postId, workspaceId, targets: { every: { id: current.id } } }, data: { mediaId: null } });
          if (change.tag !== undefined) await tx.post.updateMany({ where: { id: current.postId, workspaceId }, data: { tagId: await tagFor(tx, change.tag) } });
          return true;
        });
        const row = ok ? await one(current.id) : null;
        return row && showTarget(row);
      },
      remove: (id: string) =>
        prisma.$transaction(async (tx) => {
          const row = await tx.postTarget.findFirst({ where: { id, workspaceId }, select: { postId: true } });
          if (!row) return false;
          const { count } = await tx.postTarget.deleteMany({ where: { id, workspaceId, status: { in: REMOVABLE }, attempts: { none: {} } } });
          if (count) await tx.post.deleteMany({ where: { id: row.postId, workspaceId, targets: { none: {} } } });
          return count === 1;
        }),
    },
    media: {
      list: async () => (await prisma.mediaAsset.findMany({ where: { workspaceId, deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1000 })).map(showMedia),
      create: async (input: MediaInput) =>
        showMedia(
          await prisma.mediaAsset.create({
            data: {
              workspaceId, sourceUrl: input.url, name: input.name, mimeType: input.type === "video" ? "video/mp4" : "image/jpeg", sizeBytes: input.size ?? 0,
              width: input.width, height: input.height, folder: input.folder, tags: input.tags, status: "READY",
            },
          })
        ),
      update: async (id: string, data: { name?: string; folder?: string; tags?: string }) => {
        const { count } = await prisma.mediaAsset.updateMany({ where: { id, workspaceId, deletedAt: null }, data });
        const row = count ? await prisma.mediaAsset.findFirst({ where: { id, workspaceId } }) : null;
        return row && showMedia(row);
      },
      remove: async (id: string) => {
        const waiting: Prisma.PostTargetWhereInput = { status: { notIn: ["PUBLISHED", "FAILED", "CANCELLED"] } };
        const used = await prisma.postTarget.count({ where: { workspaceId, ...waiting, OR: [{ mediaId: id }, { mediaId: null, post: { mediaId: id } }] } });
        if (used) throw new HttpError(409, "IN_USE", "A draft or scheduled post still uses this file.");
        return (await prisma.mediaAsset.updateMany({ where: { id, workspaceId, deletedAt: null }, data: { deletedAt: new Date(), status: "DELETED" } })).count === 1;
      },
    },
    tags: {
      list: () => prisma.postTag.findMany({ where: { workspaceId }, orderBy: { name: "asc" }, take: 200, select: { id: true, name: true, color: true } }),
      count: () => prisma.postTag.count({ where: { workspaceId } }),
      save: (name: string, color: string) =>
        prisma.postTag.upsert({ where: { workspaceId_name: { workspaceId, name } }, create: { workspaceId, name, color }, update: { color }, select: { id: true, name: true, color: true } }),
      remove: (id: string) =>
        prisma.$transaction(async (tx) => {
          await tx.post.updateMany({ where: { workspaceId, tagId: id }, data: { tagId: null } });
          return (await tx.postTag.deleteMany({ where: { id, workspaceId } })).count === 1;
        }),
    },
    accounts: {
      list: () => prisma.socialAccount.findMany({ where: { workspaceId, status: { not: "DISCONNECTED" } }, orderBy: { createdAt: "asc" }, take: 200 }),
      get: (id: string) => prisma.socialAccount.findFirst({ where: { id, workspaceId, status: { not: "DISCONNECTED" } } }),
      rename: (id: string, name: string) => prisma.socialAccount.updateMany({ where: { id, workspaceId }, data: { name } }),
      /** Every account, switched-off ones included. Only for the Channels page. */
      listAll: () => prisma.socialAccount.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" }, take: 200 }),
      // Switched off here only. The connection at the social service is left alone, so it can be turned back on.
      disconnect: (id: string) => prisma.socialAccount.updateMany({ where: { id, workspaceId, status: { not: "DISCONNECTED" } }, data: { status: "DISCONNECTED", disconnectedAt: new Date() } }),
      // Back on, and checked again at the social service on the next refresh.
      enable: (id: string) => prisma.socialAccount.updateMany({ where: { id, workspaceId, status: "DISCONNECTED" }, data: { status: "ACTIVE", disconnectedAt: null, lastCheckedAt: null } }),
      /** Every account on one platform at once, for logins shared by all their Pages (Facebook, Instagram). */
      disconnectPlatform: (platform: Platform) => prisma.socialAccount.updateMany({ where: { workspaceId, platform, status: { not: "DISCONNECTED" } }, data: { status: "DISCONNECTED", disconnectedAt: new Date() } }),
      enablePlatform: (platform: Platform) => prisma.socialAccount.updateMany({ where: { workspaceId, platform, status: "DISCONNECTED" }, data: { status: "ACTIVE", disconnectedAt: null, lastCheckedAt: null } }),
    },
  };
}
