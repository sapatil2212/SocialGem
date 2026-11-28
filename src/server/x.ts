import { createHash, randomBytes } from "node:crypto";
import { callbackFor, readTokens, realSetting, signedOut, type DirectProvider } from "./direct";
import { HttpError } from "./errors";
import { tokenKeyReady } from "./tokens";

// Only this module talks to X. Each customer signs in with X (OAuth 2.0 with PKCE)
// and we post with their own token, never with an account of ours.
const AUTHORIZE = "https://x.com/i/oauth2/authorize";
const API = "https://api.x.com/2";
// Only what text posts need. X refuses the whole sign-in if the app lacks any scope asked for,
// so media.write is added when media upload is built.
const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];

export function xConfig() {
  return { clientId: realSetting(process.env.X_CLIENT_ID), clientSecret: realSetting(process.env.X_CLIENT_SECRET), callback: callbackFor("x", process.env.X_CALLBACK_URL) };
}

export const xReady = () => {
  const c = xConfig();
  return Boolean(c.clientId && c.clientSecret && /^https?:\/\/[^/]+/.test(c.callback) && tokenKeyReady());
};

export const pkceVerifier = () => randomBytes(48).toString("base64url");
const challenge = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

async function call(path: string, init: { token?: string; form?: Record<string, string>; body?: string } = {}) {
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
  const method = body ? "POST" : "GET";
  let response: Response;
  try {
    response = await fetch(API + path, { method, headers, body, redirect: "error", signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new HttpError(502, "PROVIDER", "X did not respond. Please try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // X's own reason, kept short. It never contains our secret or the user's token.
    const reason = String(data?.error_description || data?.detail || data?.title || data?.error || "").replace(/\s+/g, " ").slice(0, 200);
    console.error("[x]", method, path.split("?")[0], response.status, reason);
    if (response.status === 401 || data?.error === "invalid_grant") throw signedOut("X");
    if (response.status === 429) throw new HttpError(429, "LIMIT", "X's posting limit was reached. Please try again later.");
    if (response.status === 403) throw new HttpError(403, "REFUSED", reason ? `X refused: ${reason}` : "X refused the request.");
    throw new HttpError(502, "PROVIDER", "X could not complete that.");
  }
  return data;
}

export const xProvider: DirectProvider = {
  key: "x",
  platform: "X",
  label: "X",
  ready: xReady,
  authorizeUrl(state, verifier) {
    const c = xConfig();
    const url = new URL(AUTHORIZE);
    url.search = new URLSearchParams({
      response_type: "code", client_id: c.clientId, redirect_uri: c.callback, scope: SCOPES.join(" "),
      state, code_challenge: challenge(verifier), code_challenge_method: "S256",
    }).toString();
    return url.toString();
  },
  async exchange(code, verifier) {
    const c = xConfig();
    return readTokens(await call("/oauth2/token", { form: { grant_type: "authorization_code", code, redirect_uri: c.callback, code_verifier: verifier, client_id: c.clientId } }), 7200);
  },
  async refresh(refresh) {
    return readTokens(await call("/oauth2/token", { form: { grant_type: "refresh_token", refresh_token: refresh, client_id: xConfig().clientId } }), 7200);
  },
  async me(access) {
    const { data } = await call("/users/me?user.fields=profile_image_url", { token: access });
    if (!data || typeof data.id !== "string" || typeof data.username !== "string") throw new HttpError(502, "PROVIDER", "X sent an unexpected reply.");
    return { id: data.id.slice(0, 40), name: `@${data.username.slice(0, 50)}`, avatarUrl: typeof data.profile_image_url === "string" ? data.profile_image_url : null };
  },
};

/** Posts text as the signed-in user. Returns the new post's id and address. */
export async function xCreatePost(access: string, text: string) {
  const { data } = await call("/tweets", { token: access, body: JSON.stringify({ text }) });
  if (!data || typeof data.id !== "string") throw new HttpError(502, "PROVIDER", "X sent an unexpected reply.");
  return { id: data.id, url: `https://x.com/i/web/status/${data.id}` };
}
