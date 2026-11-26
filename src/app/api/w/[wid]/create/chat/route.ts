import { guardWorkspace } from "@/server/guard";
import { chatInput, creativeTurn } from "@/server/ai/create";

// One message in the Create post chat. Each picture is also checked against the AI budget.
export const POST = guardWorkspace({ body: chatInput, limit: { name: "create-chat", max: 80, seconds: 86400 } }, ({ user, workspace, body }) =>
  creativeTurn(workspace, user.id, body)
);
