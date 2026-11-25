import { dataFor } from "@/server/data";
import { guard, notFound } from "@/server/guard";
import { updateMedia } from "@/server/schemas";

export const PATCH = guard({ body: updateMedia, limit: { name: "media-edit", max: 300, seconds: 3600 } }, async ({ user, body, params }) => {
  const asset = await dataFor(user.id).media.update(params.id, body);
  if (!asset) throw notFound();
  return { success: true, asset };
});

export const DELETE = guard({ limit: { name: "media-delete", max: 300, seconds: 3600 } }, async ({ user, params }) => {
  if (!(await dataFor(user.id).media.remove(params.id))) throw notFound();
  return { success: true };
});
