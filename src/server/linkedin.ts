import { callbackFor, readTokens, realSetting, signedOut, type DirectProvider } from "./direct";
import { HttpError } from "./errors";
import { tokenKeyReady } from "./tokens";

// Only this module talks to LinkedIn. Each customer signs in with LinkedIn and we post
// to their own profile with their token. Needs the "Sign In with LinkedIn using OpenID
// Connect" and "Share on LinkedIn" products on the LinkedIn app. Company Pages need
// LinkedIn's Community Management API approval and are not offered yet.
const AUTH = "https://www.linkedin.com/oauth/v2";
const API = "https://api.linkedin.com";
const SCOPES = ["openid", "profile", "w_member_social"];

export function linkedinConfig() {
  return {
    clientId: realSetting(process.env.LINKEDIN_CLIENT_ID),
    clientSecret: realSetting(process.env.LINKEDIN_CLIENT_SECRET),
    callback: callbackFor("linkedin", process.env.LINKEDIN_CALLBACK_URL),
    // Optional: pin one monthly API version (YYYYMM). Otherwise a recent active one is found.
    version: /^\d{6}$/.test(realSetting(process.env.LINKEDIN_API_VERSION)) ? realSetting(process.env.LINKEDIN_API_VERSION) : "",
  };
}

// LinkedIn releases an API version each month and retires each one after about a year,
// answering 426 for a retired (or not yet released) one. Try recent months, newest first,
// and remember the first that works.
let activeVersion = "";
export function versionsToTry(today = new Date()) {
  const months: string[] = [];
  for (let back = 0; back < 10; back++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - back, 1));
    months.push(`${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return [...new Set([linkedinConfig().version, activeVersion, ...months].filter(Boolean))];
}
export const resetLinkedInVersion = () => (activeVersion = "");

export const linkedinReady = () => {
  const c = linkedinConfig();
  return Boolean(c.clientId && c.clientSecret && /^https?:\/\/[^/]+/.test(c.callback) && tokenKeyReady());
};

async function call(url: string, init: { token?: string; form?: Record<string, string>; json?: unknown; version?: string } = {}) {
  const headers: Record<string, string> = {};
  let body: string | undefined;
  if (init.form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(init.form).toString();
  }
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  if (init.version) {
    headers["LinkedIn-Version"] = init.version;
    headers["X-Restli-Protocol-Version"] = "2.0.0";
  }
  const method = body ? "POST" : "GET";
  let response: Response;
  try {
    response = await fetch(url, { method, headers, body, redirect: "error", signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new HttpError(502, "PROVIDER", "LinkedIn did not respond. Please try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // LinkedIn's own reason, kept short. It never contains our secret or the user's token.
    const reason = String(data?.error_description || data?.message || data?.error || "").replace(/\s+/g, " ").slice(0, 200);
    console.error("[linkedin]", method, new URL(url).pathname, response.status, reason);
    if (response.status === 401 || data?.error === "invalid_grant") throw signedOut("LinkedIn");
    // The version was refused before anything was posted: safe to try another.
    if (response.status === 426) throw new HttpError(400, "VERSION", reason || "LinkedIn did not accept the API version.");
    if (response.status === 429) throw new HttpError(429, "LIMIT", "LinkedIn's posting limit was reached. Please try again later.");
    if (response.status === 403) throw new HttpError(403, "REFUSED", reason ? `LinkedIn refused: ${reason}` : "LinkedIn refused the request.");
    if (response.status >= 400 && response.status < 500) throw new HttpError(400, "REFUSED", reason ? `LinkedIn refused: ${reason}` : "LinkedIn refused the post.");
    throw new HttpError(502, "PROVIDER", "LinkedIn could not complete that.");
  }
  return { data, headers: response.headers };
}

export const linkedinProvider: DirectProvider = {
  key: "linkedin",
  platform: "LINKEDIN",
  label: "LinkedIn",
  ready: linkedinReady,
  authorizeUrl(state) {
    const c = linkedinConfig();
    const url = new URL(`${AUTH}/authorization`);
    url.search = new URLSearchParams({ response_type: "code", client_id: c.clientId, redirect_uri: c.callback, scope: SCOPES.join(" "), state }).toString();
    return url.toString();
  },
  async exchange(code) {
    const c = linkedinConfig();
    const { data } = await call(`${AUTH}/accessToken`, { form: { grant_type: "authorization_code", code, redirect_uri: c.callback, client_id: c.clientId, client_secret: c.clientSecret } });
    return readTokens(data, 60 * 24 * 3600);
  },
  async refresh(refresh) {
    // Only apps LinkedIn has approved for refresh tokens receive one; others reconnect every 60 days.
    const c = linkedinConfig();
    const { data } = await call(`${AUTH}/accessToken`, { form: { grant_type: "refresh_token", refresh_token: refresh, client_id: c.clientId, client_secret: c.clientSecret } });
    return readTokens(data, 60 * 24 * 3600);
  },
  async me(access) {
    const { data } = await call(`${API}/v2/userinfo`, { token: access });
    if (typeof data?.sub !== "string") throw new HttpError(502, "PROVIDER", "LinkedIn sent an unexpected reply.");
    const name = String(data.name || [data.given_name, data.family_name].filter(Boolean).join(" ") || "LinkedIn profile").slice(0, 150);
    return { id: data.sub.slice(0, 60), name, avatarUrl: typeof data.picture === "string" ? data.picture : null };
  },
};

/** Posts text to the member's own profile. Returns the new post's id and address. */
export async function linkedinCreatePost(access: string, memberId: string, text: string) {
  const json = {
    author: `urn:li:person:${memberId}`,
    commentary: text,
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };
  let last: unknown = null;
  for (const version of versionsToTry()) {
    try {
      const { headers } = await call(`${API}/rest/posts`, { token: access, version, json });
      activeVersion = version;
      const id = headers.get("x-restli-id") || headers.get("x-linkedin-id") || "";
      if (!id) throw new HttpError(502, "PROVIDER", "LinkedIn sent an unexpected reply.");
      return { id, url: `https://www.linkedin.com/feed/update/${id}/` };
    } catch (error) {
      if (!(error instanceof HttpError && error.code === "VERSION")) throw error;
      if (activeVersion === version) activeVersion = "";
      last = error;
    }
  }
  throw last instanceof HttpError ? new HttpError(400, "VERSION", "LinkedIn did not accept any recent API version. Set LINKEDIN_API_VERSION to a current one.") : last;
}
