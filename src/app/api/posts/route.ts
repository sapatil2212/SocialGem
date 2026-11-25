import { dataFor } from "@/server/data";
import { guard, HttpError } from "@/server/guard";
import { enabledPlatforms, listAccounts, platformKey } from "@/server/muapi";
import { createPost } from "@/server/schemas";

const date = (value: string | null) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined;
};

// Reading never publishes. The worker in M4 does that.
export const GET = guard({}, ({ user, query }) => dataFor(user.id).posts.list(date(query.get("from")), date(query.get("to"))));

export const POST = guard({ body: createPost, limit: { name: "post-create", max: 120, seconds: 3600 } }, async ({ user, body }) => {
  if (body.mode === "now") throw new HttpError(503, "PUBLISHING_OFF", "Publishing is not switched on yet. You can save a draft or schedule.");
  const scheduling = body.mode === "schedule";
  if (scheduling && (!body.scheduledAt || body.scheduledAt <= new Date())) throw new HttpError(400, "INVALID", "Choose a time in the future.");

  const accounts = scheduling ? await listAccounts(user.id) : [];
  const rows = body.platforms.map((platform) => {
    const own = body.platformOverrides?.[platform];
    const mediaUrl = own?.mediaUrl || body.mediaUrl;
    const description = own?.description ?? body.description;
    const title = own?.title ?? body.title;
    let account;
    if (scheduling) {
      if (!enabledPlatforms().includes(platformKey(platform))) throw new HttpError(400, "PLATFORM_OFF", `${platform} is not available yet.`);
      account = accounts.find((a) => a.id === body.platformAccountMap?.[platform] && a.connected && platformKey(a.platform_name) === platformKey(platform));
      if (!account) throw new HttpError(400, "ACCOUNT", `Choose a connected account for ${platform}.`);
      if (platform === "instagram" && !mediaUrl) throw new HttpError(400, "INVALID", "Instagram needs a photo or video.");
      if (!mediaUrl && !description.trim() && !title.trim()) throw new HttpError(400, "INVALID", "Write something or add media.");
    }
    return {
      platform,
      accountId: account?.id ?? 0,
      accountName: account?.account_name ?? "No account chosen",
      mediaUrl,
      title,
      description,
      tags: own?.tags ?? body.tags,
      customTag: body.customTag || null,
      tagColor: body.tagColor || null,
      privacy: body.privacy || "public",
      disableComment: body.disableComment ?? false,
      disableDuet: body.disableDuet ?? false,
      disableStitch: body.disableStitch ?? false,
      madeForKids: body.madeForKids ?? false,
      categoryId: body.categoryId || null,
      scheduledAt: body.scheduledAt ?? new Date(),
      status: scheduling ? "scheduled" : "draft",
    };
  });
  const posts = await dataFor(user.id).posts.createMany(rows);
  return { success: true, posts, count: posts.length };
});
