import { dataFor } from "@/server/data";
import { guardWorkspace, notFound } from "@/server/guard";
import { updateMedia } from "@/server/schemas";

export const PATCH = guardWorkspace({ body: updateMedia, limit: { name: "media-edit", max: 300, seconds: 3600 } }, async ({ workspace, body, params }) => {
  const asset = await dataFor(workspace.id).media.update(params.id, body);
  if (!asset) throw notFound();
  return { success: true, asset };
});

export const DELETE = guardWorkspace({ limit: { name: "media-delete", max: 300, seconds: 3600 } }, async ({ workspace, params }) => {
  if (!(await dataFor(workspace.id).media.remove(params.id))) throw notFound();
  return { success: true };
});
