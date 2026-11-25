import { dataFor } from "@/server/data";
import { guard, notFound } from "@/server/guard";

export const DELETE = guard({ limit: { name: "tag-delete", max: 100, seconds: 3600 } }, async ({ user, params }) => {
  if (params.id.startsWith("suggested-")) return { success: true, id: params.id };
  if (!(await dataFor(user.id).tags.remove(params.id))) throw notFound();
  return { success: true, id: params.id };
});
