import { z } from "zod";
import { approveAndSchedule } from "@/server/ai/studio";
import { guardWorkspace } from "@/server/guard";

const body = z.object({ ideaIds: z.array(z.string().max(40)).min(1, "Choose at least one post.").max(40) });

export const POST = guardWorkspace({ body, limit: { name: "studio-schedule", max: 60, seconds: 3600 } }, ({ user, workspace, params, body }) => approveAndSchedule(workspace, user.id, params.id, body.ideaIds));
