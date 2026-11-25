import { attemptResult } from "@/server/accounts";
import { guardWorkspace, notFound } from "@/server/guard";

// Read only. Adopting an account happens in the callback, never here: otherwise
// someone could send their own connect link to another person and collect the account.
export const GET = guardWorkspace({}, async ({ user, workspace, params }) => {
  const result = await attemptResult(workspace.id, user.id, params.id);
  if (!result) throw notFound();
  return { result };
});
