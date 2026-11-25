import { startConnect } from "@/server/accounts";
import { guardWorkspace } from "@/server/guard";
import { connect } from "@/server/schemas";

export const POST = guardWorkspace({ body: connect, limit: { name: "connect", max: 20, seconds: 3600 }, roles: ["OWNER", "ADMIN"] }, ({ user, workspace, body }) =>
  startConnect(workspace, user.id, body.platform)
);
