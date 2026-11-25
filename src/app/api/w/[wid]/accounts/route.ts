import { showAccount, syncAccounts } from "@/server/accounts";
import { guardWorkspace } from "@/server/guard";

export const GET = guardWorkspace({}, async ({ workspace }) => (await syncAccounts(workspace)).map(showAccount));
