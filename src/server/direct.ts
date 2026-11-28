import type { Platform } from "@prisma/client";
import { HttpError } from "./errors";

// Platforms we connect to directly, with each customer's own sign-in, instead of through MuAPI.
export type DirectTokens = { access: string; refresh: string | null; expiresAt: number };
export type DirectUser = { id: string; name: string; avatarUrl: string | null };

export type DirectProvider = {
  key: "x" | "linkedin";
  platform: Platform;
  label: string;
  ready(): boolean;
  authorizeUrl(state: string, verifier: string): string;
  exchange(code: string, verifier: string): Promise<DirectTokens>;
  me(access: string): Promise<DirectUser>;
  /** Absent when the platform gives no refresh token: the account must be reconnected when it expires. */
  refresh?(refresh: string): Promise<DirectTokens>;
};

// Values copied from an example file ("YOUR_CLIENT_ID") count as not set.
export const realSetting = (value?: string) => (value && !/^your[_-]/i.test(value) ? value.trim() : "");
export const appBase = () => (process.env.APP_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
export const callbackFor = (key: string, configured?: string) => realSetting(configured) || `${appBase()}/api/social/${key}/callback`;

export function readTokens(data: Record<string, unknown>, fallbackSeconds: number): DirectTokens {
  if (typeof data.access_token !== "string") throw new HttpError(502, "PROVIDER", "The social service sent an unexpected reply.");
  const seconds = typeof data.expires_in === "number" ? data.expires_in : fallbackSeconds;
  return { access: data.access_token, refresh: typeof data.refresh_token === "string" ? data.refresh_token : null, expiresAt: Date.now() + seconds * 1000 };
}

/** Error shared by every provider when its sign-in has ended. */
export const signedOut = (label: string) => new HttpError(401, "SIGNED_OUT", `${label} has signed this account out. Please reconnect it.`);
