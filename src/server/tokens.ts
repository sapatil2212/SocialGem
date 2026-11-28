import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { HttpError } from "./errors";

// Sign-in tokens for platforms we connect to directly (X) are stored encrypted.
// The key comes from TOKEN_KEY, or from NEXTAUTH_SECRET when that is not set.
// Changing it means every direct connection has to be made again.
function key() {
  const secret = process.env.TOKEN_KEY || process.env.NEXTAUTH_SECRET || "";
  if (secret.length < 16) throw new HttpError(503, "NOT_CONFIGURED", "This feature is not set up on the server yet.");
  return Buffer.from(hkdfSync("sha256", secret, "socialgem", "social-account-tokens:v1", 32));
}

export const tokenKeyReady = () => (process.env.TOKEN_KEY || process.env.NEXTAUTH_SECRET || "").length >= 16;

/** AES-256-GCM. Output: v1.<iv>.<tag>.<ciphertext>, base64url. */
export function sealTokens(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), body].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function openTokens<T>(sealed: string): T {
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !body) throw new Error("Unreadable token record");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8")) as T;
}
