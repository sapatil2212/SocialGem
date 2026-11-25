import { guard } from "@/server/guard";
import { workspaceInput } from "@/server/schemas";
import { createWorkspace, listWorkspaces } from "@/server/workspaces";

export const GET = guard({}, ({ user }) => listWorkspaces(user.id));

export const POST = guard({ body: workspaceInput, limit: { name: "workspace-create", max: 10, seconds: 3600 } }, ({ user, body }) => createWorkspace(user.id, body));
