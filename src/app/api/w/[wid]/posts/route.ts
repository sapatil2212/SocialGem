import { dataFor, toPlatform } from "@/server/data";
import { guardWorkspace, HttpError } from "@/server/guard";
import { enabledPlatforms, mediaProblem, platformKey } from "@/server/muapi";
import { nudgePublisher } from "@/server/publisher";
import { createPost } from "@/server/schemas";

const date = (value: string | null) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined;
};

// Reading never publishes. The publisher (src/server/publisher.ts) does that.
export const GET = guardWorkspace({}, ({ workspace, query }) => dataFor(workspace.id).posts.list(date(query.get("from")), date(query.get("to"))));

export const POST = guardWorkspace({ body: createPost, limit: { name: "post-create", max: 120, seconds: 3600 } }, async ({ user, workspace, body }) => {
  const draft = body.mode === "draft";
  const now = body.mode === "now";
  // "Publish now" is a post scheduled for this moment: the publisher sends it within seconds.
  const scheduledAt = now ? new Date() : body.scheduledAt;
  if (!draft && !now && (!scheduledAt || scheduledAt <= new Date())) throw new HttpError(400, "INVALID", "Choose a time in the future.");

  const data = dataFor(workspace.id);
  const accounts = await data.accounts.list();
  const targets = body.platforms.map((platform) => {
    const own = body.platformOverrides?.[platform];
    const mediaUrl = own?.mediaUrl || body.mediaUrl;
    const text = (own?.description ?? body.description).trim() || (own?.title ?? body.title).trim();
    const account = accounts.find((a) => a.id === body.platformAccountMap?.[platform] && a.platform === toPlatform(platform));
    if (!draft) {
      if (!enabledPlatforms().includes(platformKey(platform))) throw new HttpError(400, "PLATFORM_OFF", `${platform} is not available yet.`);
      if (account?.status !== "ACTIVE") throw new HttpError(400, "ACCOUNT", `Choose a connected account for ${platform}.`);
      const problem = mediaProblem(platform, mediaUrl, own?.title ?? body.title);
      if (problem) throw new HttpError(400, "INVALID", problem);
      if (!mediaUrl && !text) throw new HttpError(400, "INVALID", "Write something or add media.");
    }
    return {
      platform,
      socialAccountId: account?.id ?? null,
      caption: own?.description ?? null,
      mediaUrl,
      options: {
        title: own?.title, hashtags: own?.tags ?? body.tags, privacy: body.privacy, categoryId: body.categoryId, madeForKids: body.madeForKids,
        disableComment: body.disableComment, disableDuet: body.disableDuet, disableStitch: body.disableStitch,
      },
    };
  });

  const posts = await data.posts.create({
    createdById: user.id, requestKey: body.requestKey, title: body.title, caption: body.description, mediaUrl: body.mediaUrl,
    tag: body.customTag ? { name: body.customTag, color: body.tagColor || "#FF6B00" } : null,
    scheduledAt: scheduledAt ?? null, draft, targets,
  });
  if (now) nudgePublisher();
  return { success: true, posts, count: posts.length };
});
