import { showAccount, syncAccounts } from "@/server/accounts";
import { dataFor } from "@/server/data";
import { guardWorkspace, notFound } from "@/server/guard";

// Turns a disconnected channel back on, then checks it with the social service straight away.
export const POST = guardWorkspace({ limit: { name: "account-edit", max: 60, seconds: 3600 }, roles: ["OWNER", "ADMIN"] }, async ({ workspace, params }) => {
  const { accounts } = dataFor(workspace.id);
  if (!(await accounts.enable(params.id)).count) throw notFound();
  const fresh = await syncAccounts(workspace, 0);
  const account = fresh.find((a) => a.id === params.id);
  if (!account) throw notFound();
  return showAccount(account);
});
