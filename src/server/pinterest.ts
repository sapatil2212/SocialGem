import { callbackFor, readTokens, realSetting, signedOut, type DirectProvider } from "./direct";
import { HttpError } from "./errors";
import { tokenKeyReady } from "./tokens";

// Only this module talks to Pinterest. Each customer signs in with Pinterest and we
// create Pins on their own boards with their token. New Pinterest apps start with
// Trial access, where Pins are visible only to the app's owner; public Pins need
// Pinterest to grant Standard access.
const AUTHORIZE = "https://www.pinterest.com/oauth/";
const API = "https://api.pinterest.com/v5";
const SCOPES = ["user_accounts:read", "boards:read", "pins:read", "pins:write"];

export function pinterestConfig() {
  return {
    clientId: realSetting(process.env.PINTEREST_CLIENT_ID),
    clientSecret: realSetting(process.env.PINTEREST_CLIENT_SECRET),
    callback: callbackFor("pinterest", process.env.PINTEREST_CALLBACK_URL),
  };
}

export const pinterestReady = () => {
  const c = pinterestConfig();
  return Boolean(c.clientId && c.clientSecret && /^https?:\/\/[^/]+/.test(c.callback) && tokenKeyReady());
};

async function call(path: string, init: { token?: string; form?: Record<string, string>; json?: unknown } = {}) {
  const c = pinterestConfig();
  const headers: Record<string, string> = {};
  let body: string | undefined;
  if (init.form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    headers.Authorization = `Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64")}`;
    body = new URLSearchParams(init.form).toString();
  } else if (init.token) {
    headers.Authorization = `Bearer ${init.token}`;
  }
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  const method = body ? "POST" : "GET";
  let response: Response;
  try {
    response = await fetch(API + path, { method, headers, body, redirect: "error", signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new HttpError(502, "PROVIDER", "Pinterest did not respond. Please try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Pinterest's own reason, kept short. It never contains our secret or the user's token.
    const reason = String(data?.message || data?.error_description || data?.error || "").replace(/\s+/g, " ").slice(0, 200);
    console.error("[pinterest]", method, path.split("?")[0], response.status, reason);
    if (response.status === 401 || data?.error === "invalid_grant") throw signedOut("Pinterest");
    if (response.status === 429) throw new HttpError(429, "LIMIT", "Pinterest's limit was reached. Please try again later.");
    if (response.status === 403) throw new HttpError(403, "REFUSED", reason ? `Pinterest refused: ${reason}` : "Pinterest refused the request.");
    if (response.status === 400 && reason) throw new HttpError(400, "REFUSED", `Pinterest refused: ${reason}`);
    throw new HttpError(502, "PROVIDER", "Pinterest could not complete that.");
  }
  return data;
}

export const pinterestProvider: DirectProvider = {
  key: "pinterest",
  platform: "PINTEREST",
  label: "Pinterest",
  ready: pinterestReady,
  authorizeUrl(state) {
    const c = pinterestConfig();
    const url = new URL(AUTHORIZE);
    url.search = new URLSearchParams({ client_id: c.clientId, redirect_uri: c.callback, response_type: "code", scope: SCOPES.join(","), state }).toString();
    return url.toString();
  },
  async exchange(code) {
    return readTokens(await call("/oauth/token", { form: { grant_type: "authorization_code", code, redirect_uri: pinterestConfig().callback } }), 30 * 24 * 3600);
  },
  async refresh(refresh) {
    return readTokens(await call("/oauth/token", { form: { grant_type: "refresh_token", refresh_token: refresh } }), 30 * 24 * 3600);
  },
  async me(access) {
    const data = await call("/user_account", { token: access });
    if (typeof data?.username !== "string") throw new HttpError(502, "PROVIDER", "Pinterest sent an unexpected reply.");
    const id = typeof data.id === "string" && data.id ? data.id : data.username;
    return { id: id.slice(0, 60), name: String(data.business_name || data.username).slice(0, 150), avatarUrl: typeof data.profile_image === "string" ? data.profile_image : null };
  },
};

export type PinterestBoard = { id: string; name: string };

/** The member's boards, for choosing where a Pin goes. */
export async function pinterestBoards(access: string): Promise<PinterestBoard[]> {
  const boards: PinterestBoard[] = [];
  let bookmark = "";
  for (let page = 0; page < 10; page++) {
    const data = await call(`/boards?page_size=100${bookmark ? `&bookmark=${encodeURIComponent(bookmark)}` : ""}`, { token: access });
    for (const b of Array.isArray(data?.items) ? data.items : []) if (typeof b?.id === "string") boards.push({ id: b.id, name: String(b.name || "Board").slice(0, 120) });
    bookmark = typeof data?.bookmark === "string" ? data.bookmark : "";
    if (!bookmark) break;
  }
  return boards;
}

export type PinInput = { boardId: string; imageUrl: string; title: string; description: string; link?: string };

/** Creates one Pin from a public image address. Returns the Pin's id and address. */
export async function pinterestCreatePin(access: string, pin: PinInput) {
  const json: Record<string, unknown> = {
    board_id: pin.boardId,
    title: pin.title,
    description: pin.description,
    media_source: { source_type: "image_url", url: pin.imageUrl },
  };
  if (pin.link) json.link = pin.link;
  const data = await call("/pins", { token: access, json });
  if (typeof data?.id !== "string") throw new HttpError(502, "PROVIDER", "Pinterest sent an unexpected reply.");
  return { id: data.id, url: `https://www.pinterest.com/pin/${data.id}/` };
}
