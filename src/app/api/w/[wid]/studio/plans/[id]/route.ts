import { getPlan } from "@/server/ai/studio";
import { guardWorkspace } from "@/server/guard";

export const GET = guardWorkspace({}, ({ workspace, params }) => getPlan(workspace.id, params.id));
