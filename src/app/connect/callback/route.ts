import { NextResponse } from "next/server";
import { finishConnect } from "@/server/accounts";
import { currentUser } from "@/server/guard";

// The social service sends people back here. The state is single use and tied to who started.
export async function GET(request: Request) {
  const base = (process.env.APP_URL || process.env.NEXTAUTH_URL || new URL(request.url).origin).replace(/\/$/, "");
  const back = (result: string) => NextResponse.redirect(`${base}/integrations?connect=${result}`);
  const user = await currentUser();
  if (!user) return NextResponse.redirect(`${base}/login?next=/integrations`);
  const state = new URL(request.url).searchParams.get("state") ?? "";
  if (!/^[\w-]{32}$/.test(state)) return back("expired");
  try {
    const { result, workspaceId } = await finishConnect(user.id, state);
    const response = back(result);
    if (workspaceId) response.cookies.set("sg_ws", workspaceId, { path: "/", sameSite: "lax", maxAge: 31_536_000 });
    return response;
  } catch (error) {
    console.error("[connect]", (error as Error).name);
    return back("failed");
  }
}
