import { showAccount, syncAccounts } from "@/server/accounts";
import { dataFor } from "@/server/data";
import { guardWorkspace } from "@/server/guard";

// ?fresh=1 asks the social service again, at most every 10 seconds.
// ?all=1 also lists disconnected channels, for the Channels page; everything else only sees usable ones.
export const GET = guardWorkspace({}, async ({ workspace, query }) => {
  const usable = await syncAccounts(workspace, query.get("fresh") ? 10 : 300);
  return (query.get("all") ? await dataFor(workspace.id).accounts.listAll() : usable).map(showAccount);
});
