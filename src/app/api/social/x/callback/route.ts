import { finishXConnect } from "@/server/accounts";
import { connectDonePage } from "@/server/connect-page";
import { currentUser } from "@/server/guard";

// X sends people back here after they approve (or refuse) SocialGem. Must match
// X_CALLBACK_URL and the callback registered in the X developer portal. The state
// is single use and tied to the person who started, so a link sent to someone
// else cannot attach an account to the wrong workspace.
export async function GET(request: Request) {
  const user = await currentUser();
  const query = new URL(request.url).searchParams;
  const state = query.get("state") || "";
  const code = query.get("code");
  let result = "expired";
  if (user && state) {
    try {
      result = (await finishXConnect(user.id, state, query.get("error") ? null : code)).result;
    } catch (error) {
      console.error("[connect x]", (error as Error).name, (error as Error).message);
      result = "failed";
    }
  }
  return connectDonePage(result, Boolean(user));
}
