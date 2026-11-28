/** The small page a connect window lands on. It tells the Channels tab, then closes itself. */
export function connectDonePage(result: string, signedIn: boolean) {
  const base = (process.env.APP_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  const known = ["connected", "taken", "none", "expired", "failed"].includes(result) ? result : "failed";
  const next = signedIn ? `${base}/integrations?connect=${known}` : `${base}/login?next=/integrations`;
  const heading = known === "connected" ? "Connected" : "Not connected";
  // `known` and `next` come only from fixed values above.
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width"><title>${heading}</title>
<body style="font:16px/1.6 system-ui,sans-serif;background:#fbfaff;color:#0f1239;display:grid;place-content:center;min-height:90vh;text-align:center">
<h1 style="font-size:28px;margin:0">${heading}</h1><p>You can close this window.</p><p><a style="color:#b04a12" href="${next}">Back to Channels</a></p>
<script>try{var c=new BroadcastChannel("sg-accounts");c.postMessage("changed");c.close()}catch(e){}window.close();setTimeout(function(){location.replace(${JSON.stringify(next)})},600)</script>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } }
  );
}
