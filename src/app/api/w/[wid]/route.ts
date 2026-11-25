import { guardWorkspace } from "@/server/guard";
import { workspaceInput } from "@/server/schemas";
import { updateWorkspace } from "@/server/workspaces";

export const PATCH = guardWorkspace(
  { body: workspaceInput.partial(), limit: { name: "workspace-edit", max: 60, seconds: 3600 }, roles: ["OWNER", "ADMIN"] },
  ({ workspace, body }) => updateWorkspace(workspace.id, body)
);
