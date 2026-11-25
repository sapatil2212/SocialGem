import { showAccount } from "@/server/accounts";
import { dataFor } from "@/server/data";
import { guardWorkspace, notFound } from "@/server/guard";
import { disconnectRemote, renameRemote } from "@/server/muapi";
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

export const DELETE = guardWorkspace({ limit, roles: ["OWNER", "ADMIN"] }, async ({ workspace, params }) => {
  const { accounts } = dataFor(workspace.id);
  const account = await accounts.get(params.id);
  if (!account) throw notFound();
  if (account.muapiAccountId) await disconnectRemote(account.muapiAccountId);
  await accounts.disconnect(account.id);
  return { success: true };
});
