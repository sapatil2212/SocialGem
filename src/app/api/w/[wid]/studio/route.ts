import { brandInput } from "@/server/ai/shapes";
import { saveBrand, studioState } from "@/server/ai/studio";
import { guardWorkspace } from "@/server/guard";

export const GET = guardWorkspace({}, ({ workspace }) => studioState(workspace));

export const PUT = guardWorkspace({ body: brandInput, limit: { name: "studio-brand", max: 60, seconds: 3600 } }, ({ workspace, body }) => saveBrand(workspace.id, body));
