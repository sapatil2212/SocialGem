import { directProvider, finishDirectConnect } from "@/server/accounts";
import { connectDonePage } from "@/server/connect-page";
import { currentUser } from "@/server/guard";

// X and LinkedIn send people back here after they approve (or refuse) SocialGem:
// /api/social/x/callback and /api/social/linkedin/callback. Each must match the
// callback set in that platform's developer app. The state is single use and tied
// to the person who started, so a link sent to someone else cannot attach an
// account to the wrong workspace.
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!directProvider(provider)) return new Response("Not found", { status: 404 });
  const user = await currentUser();
  const query = new URL(request.url).searchParams;
  const state = query.get("state") || "";
  let result = "expired";
  if (user && state) {
    try {
      result = (await finishDirectConnect(provider, user.id, state, query.get("error") ? null : query.get("code"))).result;
    } catch (error) {
      console.error("[connect]", provider, (error as Error).name, (error as Error).message);
      result = "failed";
    }
  }
  return connectDonePage(result, Boolean(user));
}
