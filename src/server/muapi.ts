import { HttpError } from "./errors";

// Only this module talks to MuAPI. Publishing is deliberately absent until M4.
const BASE = () => (process.env.MUAPI_BASE_URL || "https://api.muapi.ai").replace(/\/$/, "");
const key = () => process.env.MUAPI_API_KEY || process.env.MUAPIAPP_API_KEY || "";
export const muapiReady = () => Boolean(key());

const CONNECTABLE = ["facebook", "instagram", "youtube", "tiktok"];
export const enabledPlatforms = () =>
  (process.env.PLATFORMS_ENABLED || "facebook,instagram").split(",").map((p) => p.trim()).filter(Boolean);

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
    console.error("[muapi]", path.split("?")[0], response.status);
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

// The reversible form: the account can be reconnected later.
export const disconnectRemote = (id: number) => call(`/api/v1/social/ext/accounts/${id}/disconnect`, { method: "POST", body: "{}" });

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
