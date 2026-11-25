import { finishConnect } from "@/server/accounts";
import { currentUser } from "@/server/guard";

// The social service sends people back here, normally in the small window. The
// state is single use, tied to who started, and in the path so that services
// which rewrite query strings cannot lose it.
export async function GET(_request: Request, { params }: { params: Promise<{ state: string }> }) {
  const base = (process.env.APP_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
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
  const next = user ? `${base}/integrations?connect=${result}` : `${base}/login?next=/integrations`;
  const heading = result === "connected" ? "Connected" : "Not connected";
  // `result` and `next` come only from fixed values above.
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width"><title>${heading}</title>
<body style="font:16px/1.6 system-ui,sans-serif;background:#fbfaff;color:#0f1239;display:grid;place-content:center;min-height:90vh;text-align:center">
<h1 style="font-size:28px;margin:0">${heading}</h1><p>You can close this window.</p><p><a style="color:#b04a12" href="${next}">Back to Channels</a></p>
<script>try{var c=new BroadcastChannel("sg-accounts");c.postMessage("changed");c.close()}catch(e){}window.close();setTimeout(function(){location.replace(${JSON.stringify(next)})},600)</script>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } }
  );
}
