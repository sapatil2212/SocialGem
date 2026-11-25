import { z } from "zod";
import { setUserDisabled } from "@/server/admin";
import { guardAdmin } from "@/server/guard";

export const PATCH = guardAdmin({ body: z.object({ disabled: z.boolean() }), limit: { name: "admin-user", max: 60, seconds: 3600 } }, ({ user, params, body }) =>
  setUserDisabled(user.id, params.id, body.disabled)
);
