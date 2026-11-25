import { startConnect } from "@/server/accounts";
import { guardWorkspace } from "@/server/guard";
import { connect } from "@/server/schemas";

export const POST = guardWorkspace({ body: connect, limit: { name: "connect", max: 20, seconds: 3600 }, roles: ["OWNER", "ADMIN"] }, async ({ user, workspace, body }) => ({
  url: await startConnect(workspace, user.id, body.platform),
}));
