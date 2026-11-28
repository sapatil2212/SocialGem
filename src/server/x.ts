import { createHash, randomBytes } from "node:crypto";
import { HttpError } from "./errors";
import { tokenKeyReady } from "./tokens";

// Only this module talks to X. Each customer signs in with X (OAuth 2.0 with PKCE)
// and we post with their own token, never with an account of ours.
const AUTHORIZE = "https://x.com/i/oauth2/authorize";
const API = "https://api.x.com/2";
const SCOPES = ["tweet.read", "tweet.write", "users.read", "media.write", "offline.access"];

// Values copied from an example file ("YOUR_CLIENT_ID") count as not set.
const real = (value?: string) => (value && !/^your[_-]/i.test(value) ? value.trim() : "");
const appBase = () => (process.env.APP_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "");

export function xConfig() {
  return {
    clientId: real(process.env.X_CLIENT_ID),
    clientSecret: real(process.env.X_CLIENT_SECRET),
    callback: real(process.env.X_CALLBACK_URL) || `${appBase()}/api/social/x/callback`,
  };
}

export const xReady = () => {
  const c = xConfig();
  return Boolean(c.clientId && c.clientSecret && /^https?:\/\/[^/]+/.test(c.callback) && tokenKeyReady());
};

export type XTokens = { access: string; refresh: string | null; expiresAt: number };
export type XUser = { id: string; username: string; name: string; avatarUrl: string | null };

export const pkceVerifier = () => randomBytes(48).toString("base64url");
const challenge = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

export function xAuthorizeUrl(state: string, verifier: string) {
  const c = xConfig();
  const url = new URL(AUTHORIZE);
  url.search = new URLSearchParams({
    response_type: "code", client_id: c.clientId, redirect_uri: c.callback, scope: SCOPES.join(" "),
    state, code_challenge: challenge(verifier), code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

async function call(path: string, init: RequestInit & { token?: string; form?: Record<string, string> } = {}) {
  const c = xConfig();
  const headers: Record<string, string> = {};
  let body = init.body;
  if (init.form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    headers.Authorization = `Basic ${Buffer.from(`${encodeURIComponent(c.clientId)}:${encodeURIComponent(c.clientSecret)}`).toString("base64")}`;
    body = new URLSearchParams(init.form).toString();
  } else if (init.token) {
    headers.Authorization = `Bearer ${init.token}`;
    if (body) headers["Content-Type"] = "application/json";
  }
  let response: Response;
  try {
    response = await fetch(API + path, { method: init.method || (body ? "POST" : "GET"), headers, body, redirect: "error", signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new HttpError(502, "PROVIDER", "X did not respond. Please try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // X's own reason, kept short. It never contains our secret or the user's token.
    const reason = String(data?.error_description || data?.detail || data?.title || data?.error || "").replace(/\s+/g, " ").slice(0, 200);
    console.error("[x]", init.method || (body ? "POST" : "GET"), path.split("?")[0], response.status, reason);
    if (response.status === 401 || data?.error === "invalid_grant") throw new HttpError(401, "X_SIGNED_OUT", "X has signed this account out. Please reconnect it.");
    if (response.status === 429) throw new HttpError(429, "X_LIMIT", "X's posting limit was reached. Please try again later.");
    if (response.status === 403) throw new HttpError(403, "X_REFUSED", reason ? `X refused: ${reason}` : "X refused the request.");
    throw new HttpError(502, "PROVIDER", "X could not complete that.");
  }
  return data;
}

function readTokens(data: Record<string, unknown>): XTokens {
  if (typeof data.access_token !== "string") throw new HttpError(502, "PROVIDER", "X sent an unexpected reply.");
  const seconds = typeof data.expires_in === "number" ? data.expires_in : 7200;
  return { access: data.access_token, refresh: typeof data.refresh_token === "string" ? data.refresh_token : null, expiresAt: Date.now() + seconds * 1000 };
}

export async function xExchangeCode(code: string, verifier: string) {
  const c = xConfig();
  return readTokens(await call("/oauth2/token", { form: { grant_type: "authorization_code", code, redirect_uri: c.callback, code_verifier: verifier, client_id: c.clientId } }));
}

export async function xRefresh(refresh: string) {
  return readTokens(await call("/oauth2/token", { form: { grant_type: "refresh_token", refresh_token: refresh, client_id: xConfig().clientId } }));
}

export async function xMe(access: string): Promise<XUser> {
  const { data } = await call("/users/me?user.fields=profile_image_url", { token: access });
  if (!data || typeof data.id !== "string" || typeof data.username !== "string") throw new HttpError(502, "PROVIDER", "X sent an unexpected reply.");
  return { id: data.id.slice(0, 40), username: data.username.slice(0, 50), name: String(data.name || data.username).slice(0, 150), avatarUrl: typeof data.profile_image_url === "string" ? data.profile_image_url : null };
}

/** Posts text as the signed-in user. Returns the new post's id and address. */
export async function xCreatePost(access: string, text: string, mediaIds: string[] = []) {
  const body: Record<string, unknown> = { text };
  if (mediaIds.length) body.media = { media_ids: mediaIds };
  const { data } = await call("/tweets", { token: access, body: JSON.stringify(body) });
  if (!data || typeof data.id !== "string") throw new HttpError(502, "PROVIDER", "X sent an unexpected reply.");
  return { id: data.id, url: `https://x.com/i/web/status/${data.id}` };
}
