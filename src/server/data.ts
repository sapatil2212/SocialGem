import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// The only way for API routes to reach customer data. Every query carries the
// owner, so another user's id behaves exactly like one that does not exist.
export const EDITABLE = ["draft", "scheduled", "failed"];

type PostData = Omit<Prisma.ScheduledPostUncheckedCreateInput, "id" | "userId" | "requestId" | "publishedUrl" | "error">;

export function dataFor(userId: string) {
  return {
    posts: {
      list: (from?: Date, to?: Date) =>
        prisma.scheduledPost.findMany({ where: { userId, scheduledAt: { gte: from, lte: to } }, orderBy: { scheduledAt: "desc" }, take: 1000 }),
      get: (id: string) => prisma.scheduledPost.findFirst({ where: { id, userId } }),
      createMany: (rows: PostData[]) => prisma.$transaction(rows.map((data) => prisma.scheduledPost.create({ data: { ...data, userId } }))),
      // The status check is part of the write, so a race cannot reopen a published post.
      update: async (id: string, data: Partial<PostData> & { error?: null }) => {
        const { count } = await prisma.scheduledPost.updateMany({ where: { id, userId, status: { in: EDITABLE } }, data });
        return count ? prisma.scheduledPost.findFirst({ where: { id, userId } }) : null;
      },
      remove: async (id: string) =>
        (await prisma.scheduledPost.deleteMany({ where: { id, userId, status: { in: [...EDITABLE, "completed"] } } })).count === 1,
    },
    media: {
      list: () => prisma.mediaAsset.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 1000 }),
      create: (data: Omit<Prisma.MediaAssetUncheckedCreateInput, "id" | "userId">) => prisma.mediaAsset.create({ data: { ...data, userId } }),
      update: async (id: string, data: Prisma.MediaAssetUncheckedUpdateManyInput) => {
        const { count } = await prisma.mediaAsset.updateMany({ where: { id, userId }, data });
        return count ? prisma.mediaAsset.findFirst({ where: { id, userId } }) : null;
      },
      remove: async (id: string) => (await prisma.mediaAsset.deleteMany({ where: { id, userId } })).count === 1,
    },
    tags: {
      list: () => prisma.postTag.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, take: 200 }),
      count: () => prisma.postTag.count({ where: { userId } }),
      save: (name: string, color: string) =>
        prisma.postTag.upsert({ where: { userId_name: { userId, name } }, create: { userId, name, color }, update: { color } }),
      remove: async (id: string) => (await prisma.postTag.deleteMany({ where: { id, userId } })).count === 1,
    },
  };
}
