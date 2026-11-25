import { showAccount, syncAccounts } from "@/server/accounts";
import { guardWorkspace } from "@/server/guard";

// ?fresh=1 asks the social service again, at most every 10 seconds.
export const GET = guardWorkspace({}, async ({ workspace, query }) => (await syncAccounts(workspace, query.get("fresh") ? 10 : 300)).map(showAccount));
