import { z } from "zod";
import { renameUser } from "@/server/google";
import { guard } from "@/server/guard";

const body = z.object({ name: z.string().trim().min(2, "Enter your name.").max(80, "Keep it under 80 characters.") });

export const PATCH = guard({ body, limit: { name: "me-name", max: 20, seconds: 3600 } }, ({ user, body }) => renameUser(user.id, body.name));
