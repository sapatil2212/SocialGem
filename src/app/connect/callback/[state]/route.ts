import { finishConnect } from "@/server/accounts";
import { connectDonePage } from "@/server/connect-page";
import { currentUser } from "@/server/guard";

// The social service sends people back here, normally in the small window. The
// state is single use, tied to who started, and in the path so that services
// which rewrite query strings cannot lose it.
export async function GET(_request: Request, { params }: { params: Promise<{ state: string }> }) {
  const user = await currentUser();
  const { state } = await params;
  let result = "expired";
  if (user && /^[\w-]{32}$/.test(state)) {
    try {
      result = (await finishConnect(user.id, state)).result;
    } catch (error) {
      console.error("[connect]", (error as Error).name);
      result = "failed";
    }
  }
  return connectDonePage(result, Boolean(user));
}
