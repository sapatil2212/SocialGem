import { dataFor, EDITABLE } from "@/server/data";
import { guard, HttpError, notFound } from "@/server/guard";
import { enabledPlatforms, ownAccount, platformKey } from "@/server/muapi";
import { updatePost } from "@/server/schemas";

const locked = () => new HttpError(409, "LOCKED", "This post has already been sent, so it cannot be changed. Duplicate it instead.");

export const PATCH = guard({ body: updatePost, limit: { name: "post-edit", max: 300, seconds: 3600 } }, async ({ user, body, params }) => {
  const { posts } = dataFor(user.id);
  const post = await posts.get(params.id);
  if (!post) throw notFound();
  if (!EDITABLE.includes(post.status)) throw locked();
  if (body.action) throw new HttpError(503, "PUBLISHING_OFF", "Publishing is not switched on yet.");

  const { mode, scheduledAt, platformAccountMap, title, description, tags, mediaUrl, privacy, customTag, tagColor, disableComment, disableDuet, disableStitch, madeForKids, categoryId } = body;
  const next = mode === "draft" ? "draft" : mode === "schedule" || (scheduledAt && post.status !== "draft") ? "scheduled" : post.status;
  const time = scheduledAt ?? post.scheduledAt;
  let account: { accountId?: number; accountName?: string } = {};

  if (next === "scheduled") {
    if (time <= new Date()) throw new HttpError(400, "INVALID", "Choose a time in the future.");
    if (!enabledPlatforms().includes(platformKey(post.platform))) throw new HttpError(400, "PLATFORM_OFF", "That platform is not available yet.");
    const owned = await ownAccount(user.id, platformAccountMap?.[post.platform] ?? post.accountId, post.platform);
    if (!owned?.connected) throw new HttpError(400, "ACCOUNT", "Choose a connected account first.");
    const media = mediaUrl ?? post.mediaUrl;
    if (post.platform === "instagram" && !media) throw new HttpError(400, "INVALID", "Instagram needs a photo or video.");
    if (!media && !(description ?? post.description)?.trim() && !(title ?? post.title).trim()) throw new HttpError(400, "INVALID", "Write something or add media.");
    account = { accountId: owned.id, accountName: owned.account_name };
  }

  const updated = await posts.update(post.id, {
    title, description, tags, mediaUrl, privacy, customTag, tagColor, disableComment, disableDuet, disableStitch, madeForKids, categoryId,
    ...account, scheduledAt: time, status: next, error: null,
  });
  if (!updated) throw locked();
  return updated;
});

export const DELETE = guard({ limit: { name: "post-delete", max: 300, seconds: 3600 } }, async ({ user, params }) => {
  const { posts } = dataFor(user.id);
  if (await posts.remove(params.id)) return { success: true };
  if (await posts.get(params.id)) throw new HttpError(409, "LOCKED", "A post that is being sent cannot be deleted.");
  throw notFound();
});
