import { dataFor } from "@/server/data";
import { guardWorkspace, notFound } from "@/server/guard";

export const DELETE = guardWorkspace({ limit: { name: "tag-delete", max: 100, seconds: 3600 } }, async ({ workspace, params }) => {
  if (params.id.startsWith("suggested-")) return { success: true, id: params.id };
  if (!(await dataFor(workspace.id).tags.remove(params.id))) throw notFound();
  return { success: true, id: params.id };
});
