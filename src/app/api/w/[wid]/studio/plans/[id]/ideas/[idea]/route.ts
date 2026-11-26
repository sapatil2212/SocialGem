import { editIdea, ideaInput, removeIdea } from "@/server/ai/studio";
import { guardWorkspace } from "@/server/guard";

export const PATCH = guardWorkspace({ body: ideaInput, limit: { name: "studio-idea", max: 300, seconds: 3600 } }, ({ workspace, params, body }) => editIdea(workspace.id, params.id, params.idea, body));

export const DELETE = guardWorkspace({ limit: { name: "studio-idea", max: 300, seconds: 3600 } }, ({ workspace, params }) => removeIdea(workspace.id, params.id, params.idea));
