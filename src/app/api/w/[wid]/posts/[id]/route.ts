import { dataFor, fromPlatform, isEditable } from "@/server/data";
import { guardWorkspace, HttpError, notFound } from "@/server/guard";
import { enabledPlatforms, mediaProblem, platformKey } from "@/server/muapi";
import { updatePost } from "@/server/schemas";

const locked = () => new HttpError(409, "LOCKED", "This post has already been sent, so it cannot be changed. Duplicate it instead.");

export const PATCH = guardWorkspace({ body: updatePost, limit: { name: "post-edit", max: 300, seconds: 3600 } }, async ({ workspace, body, params }) => {
  const { posts, accounts } = dataFor(workspace.id);
  const current = await posts.raw(params.id);
  if (!current) throw notFound();
  if (!isEditable(current.status)) throw locked();
  if (body.action) throw new HttpError(503, "PUBLISHING_OFF", "Publishing is not switched on yet.");

  const platform = fromPlatform(current.platform);
  const schedule = body.mode === "schedule" || (body.mode !== "draft" && (current.status === "SCHEDULED" || (current.status === "FAILED" && Boolean(body.scheduledAt))));
  const time = body.scheduledAt ?? current.scheduledAt;
  const shown = posts.show(current);

  let accountId = body.platformAccountMap?.[platform];
  if (accountId && accountId !== current.socialAccountId) {
    const chosen = await accounts.get(accountId);
    if (!chosen || chosen.platform !== current.platform) throw new HttpError(400, "ACCOUNT", "Choose a connected account first.");
  }
  accountId ??= current.socialAccountId ?? undefined;

  if (schedule) {
    if (!time || time <= new Date()) throw new HttpError(400, "INVALID", "Choose a time in the future.");
    if (!enabledPlatforms().includes(platformKey(platform))) throw new HttpError(400, "PLATFORM_OFF", "That platform is not available yet.");
    const account = accountId ? await accounts.get(accountId) : null;
    if (account?.status !== "ACTIVE") throw new HttpError(400, "ACCOUNT", "Choose a connected account first.");
    const media = body.mediaUrl ?? shown.mediaUrl;
    const problem = mediaProblem(platform, media, body.title ?? shown.title);
    if (problem) throw new HttpError(400, "INVALID", problem);
    if (!media && !(body.description ?? shown.description).trim() && !(body.title ?? shown.title).trim()) throw new HttpError(400, "INVALID", "Write something or add media.");
  }

  const { privacy, categoryId, madeForKids, disableComment, disableDuet, disableStitch } = body;
  const options = Object.fromEntries(Object.entries({ privacy, categoryId, madeForKids, disableComment, disableDuet, disableStitch }).filter(([, v]) => v !== undefined));
  const updated = await posts.update(current, {
    title: body.title, caption: body.description, hashtags: body.tags,
    // Unchanged media keeps following the post.
    mediaUrl: body.mediaUrl === undefined || body.mediaUrl === shown.mediaUrl ? undefined : body.mediaUrl,
    options, socialAccountId: accountId, scheduledAt: time, status: schedule ? "SCHEDULED" : "DRAFT",
    tag: body.customTag === undefined ? undefined : body.customTag ? { name: body.customTag, color: body.tagColor || "#FF6B00" } : null,
  });
  if (!updated) throw locked();
  return updated;
});

export const DELETE = guardWorkspace({ limit: { name: "post-delete", max: 300, seconds: 3600 } }, async ({ workspace, params }) => {
  const { posts } = dataFor(workspace.id);
  if (await posts.remove(params.id)) return { success: true };
  if (await posts.raw(params.id)) throw new HttpError(409, "LOCKED", "A post that was sent is kept in your history.");
  throw notFound();
});
