import { HttpError } from "./errors";
import { linkedinReady } from "./linkedin";
import { pinterestReady } from "./pinterest";
import { xReady } from "./x";

// Only this module talks to MuAPI. Publishing is deliberately absent until M4.
const BASE = () => (process.env.MUAPI_BASE_URL || "https://api.muapi.ai").replace(/\/$/, "");
const key = () => process.env.MUAPI_API_KEY || process.env.MUAPIAPP_API_KEY || "";
export const muapiReady = () => Boolean(key());

// Only these have a per-customer connect flow (external_user_id). The others would connect
// to our own MuAPI account, shared by every customer, so they stay off.
const CONNECTABLE = ["facebook", "instagram", "youtube", "tiktok"];

/** Platforms that only take video. */
export const VIDEO_ONLY = ["youtube", "tiktok"];
export const looksLikeVideo = (url: string) => /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(url);

/** Platform rules shared by every way of scheduling. Returns a reason, or "" when fine. */
export function mediaProblem(platform: string, mediaUrl: string, title: string) {
  const name = platformKey(platform);
  if (name === "instagram" && !mediaUrl) return "Instagram needs a photo or video.";
  if (name === "pinterest" && !mediaUrl) return "Pinterest needs a photo.";
  if (name === "pinterest" && looksLikeVideo(mediaUrl)) return "Pinterest Pins from SocialGem need a photo, not a video.";
  if (VIDEO_ONLY.includes(name) && !looksLikeVideo(mediaUrl)) return `${name === "youtube" ? "YouTube" : "TikTok"} needs a video link ending in .mp4, .mov, .m4v or .webm.`;
  if (name === "youtube" && !title.trim()) return "YouTube needs a title.";
  if (name === "youtube" && [...title.trim()].length > 100) return "Keep the YouTube title to 100 characters.";
  if (name === "tiktok" && [...title.trim()].length > 150) return "Keep the TikTok title to 150 characters.";
  return "";
}
export const enabledPlatforms = () =>
  (process.env.PLATFORMS_ENABLED || "facebook,instagram,youtube,tiktok,x,linkedin,pinterest").split(",").map((p) => p.trim()).filter(Boolean);

/** Whether each platform can be connected here: ready, setup (no key) or off. X, LinkedIn and Pinterest are connected directly, not through MuAPI. */
export function platformStates() {
  const on = enabledPlatforms();
  return Object.fromEntries(
    ["facebook", "instagram", "youtube", "tiktok", "x", "linkedin", "threads", "pinterest"].map((p) => {
      const state = !on.includes(p) ? "off" : p === "x" ? (xReady() ? "ready" : "setup") : p === "linkedin" ? (linkedinReady() ? "ready" : "setup") : p === "pinterest" ? (pinterestReady() ? "ready" : "setup") : !CONNECTABLE.includes(p) ? "off" : muapiReady() ? "ready" : "setup";
      return [p === "x" ? "x_twitter" : p, state];
    })
  );
}

export const platformKey = (value: string) => (value === "x_twitter" || value === "twitter" ? "x" : value.toLowerCase());

async function call(path: string, init: RequestInit = {}) {
  if (!key()) throw new HttpError(503, "NOT_CONFIGURED", "This feature is not set up on the server yet.");
  let response: Response;
  try {
    response = await fetch(BASE() + path, {
      ...init,
      headers: { "x-api-key": key(), "Content-Type": "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new HttpError(502, "PROVIDER", "The social service did not respond. Please try again.");
  }
  if (!response.ok) {
    // MuAPI's own reason, kept short; it never holds our key.
    const reason = (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);
    console.error("[muapi]", init.method || "GET", path.split("?")[0], response.status, reason);
    throw new HttpError(502, "PROVIDER", "The social service could not complete that.");
  }
  return response.json().catch(() => ({}));
}

export type RemoteAccount = { id: number; platform: string; name: string; platformUserId: string | null; connected: boolean; connectedAt: string | null };

/** Accounts connected for one workspace. Accounts held under our own key are never listed. */
export async function remoteAccounts(externalUserId: string): Promise<RemoteAccount[]> {
  const rows: unknown = await call(`/api/v1/social/ext/accounts?external_user_id=${encodeURIComponent(externalUserId)}`);
  if (!Array.isArray(rows)) throw new HttpError(502, "PROVIDER", "The social service sent an unexpected reply.");
  return rows
    .filter((a) => Number.isSafeInteger(a?.id) && (a.external_user_id === undefined || a.external_user_id === externalUserId))
    .map((a) => ({
      id: a.id,
      platform: platformKey(String(a.platform_name || "")),
      name: String(a.account_name || "Account").slice(0, 190),
      platformUserId: a.platform_user_id ? String(a.platform_user_id).slice(0, 150) : null,
      connected: a.connected !== false,
      connectedAt: typeof a.connected_at === "string" ? a.connected_at : null,
    }));
}

export async function connectUrl(externalUserId: string, platform: string, redirectTo: string) {
  const name = platformKey(platform);
  if (!enabledPlatforms().includes(name) || !CONNECTABLE.includes(name)) throw new HttpError(400, "PLATFORM_OFF", "That platform is not available yet.");
  const data = await call(`/api/v1/social/${name}/connect-url`, { method: "POST", body: JSON.stringify({ external_user_id: externalUserId, redirect_to: redirectTo }) });
  if (typeof data.url !== "string" || !data.url.startsWith("https://")) throw new HttpError(502, "PROVIDER", "The social service did not return a link.");
  return data.url as string;
}

export const renameRemote = (id: number, account_name: string) =>
  call(`/api/v1/social/ext/accounts/${id}`, { method: "PATCH", body: JSON.stringify({ account_name }) });

// We never ask MuAPI to disconnect or delete an account. On 26 Nov 2026 a "soft" disconnect of two
// Facebook Pages removed every Page on that Facebook login and blocked reconnecting it. Switching a
// channel off is done in our own database instead (see accounts.disconnect).

export async function generateText(prompt: string, system_prompt: string) {
  const job = await call("/api/v1/gpt-5-mini", { method: "POST", body: JSON.stringify({ prompt, system_prompt }) });
  const id = job.request_id || job.id;
  if (typeof id !== "string") throw new HttpError(502, "PROVIDER", "The AI service did not start.");
  for (let i = 0; i < 25; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const result = await call(`/api/v1/predictions/${encodeURIComponent(id)}/result`).catch(() => null);
    if (result?.status === "failed" || result?.status === "cancelled") break;
    if (result?.status !== "completed") continue;
    const output = Array.isArray(result.outputs) ? result.outputs[0] : result.output;
    const text = typeof output === "string" ? output : JSON.stringify(output ?? "");
    return text.slice(0, 20_000);
  }
  throw new HttpError(504, "AI_TIMEOUT", "The AI took too long. Please try again.");
}

// ---- Publishing (used only by the publisher) ----

/** A send either got a request id, or failed. "definite" means MuAPI certainly did not post it. */
export type Submitted = { ok: true; requestId: string } | { ok: false; definite: boolean; code: string; message: string };

const PUBLISH_PATHS: Record<string, string> = {
  facebook: "/api/v1/facebook-publish",
  instagram: "/api/v1/instagram-publish",
  youtube: "/api/v1/youtube-publish",
  tiktok: "/api/v1/tiktok-publish",
};

/** Sends once. Never retried here: a timeout may still have posted, so the caller treats it as unclear. */
export async function submitPublish(platform: string, body: Record<string, unknown>): Promise<Submitted> {
  const path = PUBLISH_PATHS[platformKey(platform)];
  if (!path) return { ok: false, definite: true, code: "PLATFORM_OFF", message: "That platform cannot be published to yet." };
  if (!key()) return { ok: false, definite: true, code: "NOT_CONFIGURED", message: "Publishing is not set up on the server yet." };
  let response: Response;
  try {
    response = await fetch(BASE() + path, {
      method: "POST",
      headers: { "x-api-key": key(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return { ok: false, definite: false, code: "NO_REPLY", message: "The social service did not reply, so we cannot tell whether it was posted." };
  }
  const data = await response.json().catch(() => ({}));
  const id = data?.request_id || data?.id;
  if (response.ok && typeof id === "string" && id) return { ok: true, requestId: id.slice(0, 190) };
  const reason = String(data?.detail || data?.error || data?.message || "").replace(/\s+/g, " ").slice(0, 300);
  console.error("[muapi] publish", path, response.status, reason);
  if (response.ok) return { ok: false, definite: false, code: "BAD_REPLY", message: "The social service sent an unexpected reply." };
  if (response.status === 409) return { ok: false, definite: true, code: "ACCOUNT", message: "This account needs reconnecting in Channels." };
  if (response.status >= 400 && response.status < 500) return { ok: false, definite: true, code: "REFUSED", message: reason ? `Not posted: ${reason}` : "The social service refused this post." };
  return { ok: false, definite: false, code: "PROVIDER", message: "The social service had a problem, so we cannot tell whether it was posted." };
}

export type PublishOutcome =
  | { status: "processing" }
  | { status: "completed"; url: string | null; postId: string | null }
  | { status: "failed"; message: string };

/** Asks how a send went. A network problem counts as still processing; the caller gives up after a while. */
export async function publishOutcome(requestId: string): Promise<PublishOutcome> {
  const data = await call(`/api/v1/predictions/${encodeURIComponent(requestId)}/result`).catch(() => null);
  const status = String(data?.status || "").toLowerCase();
  if (status === "completed" || status === "succeeded") {
    const out = (data.output && typeof data.output === "object" ? data.output : Array.isArray(data.outputs) && typeof data.outputs[0] === "object" ? data.outputs[0] : {}) as Record<string, unknown>;
    const url = typeof out.url === "string" && /^https:\/\//.test(out.url) ? out.url.slice(0, 2000) : null;
    const postId = [out.post_id, out.media_id, out.publish_id, out.video_id, out.id].find((v) => typeof v === "string" || typeof v === "number");
    return { status: "completed", url, postId: postId === undefined ? null : String(postId).slice(0, 190) };
  }
  if (status === "failed" || status === "error" || status === "cancelled") {
    const reason = String(data?.error || data?.detail || "").replace(/\s+/g, " ").slice(0, 300);
    return { status: "failed", message: reason ? `Not posted: ${reason}` : "The social service could not post it." };
  }
  return { status: "processing" };
}
