import { showAccount } from "@/server/accounts";
import { dataFor } from "@/server/data";
import { guardWorkspace, notFound } from "@/server/guard";
import { renameRemote } from "@/server/muapi";
import { rename } from "@/server/schemas";

const limit = { name: "account-edit", max: 60, seconds: 3600 };

export const PATCH = guardWorkspace({ body: rename, limit, roles: ["OWNER", "ADMIN"] }, async ({ workspace, body, params }) => {
  const { accounts } = dataFor(workspace.id);
  const account = await accounts.get(params.id);
  if (!account) throw notFound();
  if (account.muapiAccountId) await renameRemote(account.muapiAccountId, body.accountName);
  await accounts.rename(account.id, body.accountName);
  return showAccount({ ...account, name: body.accountName });
});

// Disconnect = switch off in SocialGem only. Nothing is posted to it until it is turned back on.
// MuAPI is not told: its disconnect can take every Page on the same Facebook login with it.
export const DELETE = guardWorkspace({ limit, roles: ["OWNER", "ADMIN"] }, async ({ workspace, params }) => {
  const { accounts } = dataFor(workspace.id);
  const account = await accounts.get(params.id);
  if (!account) throw notFound();
  await accounts.disconnect(account.id);
  return { success: true };
});
