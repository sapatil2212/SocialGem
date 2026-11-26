import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { HttpError } from "../errors";
import { geminiKey as key, geminiReady } from "./ready";
import { recordUse, requireBudget, type Actor } from "./client";

// The only module that talks to Gemini. Same price as the Lite model at 1K, and the one Google recommends.
const MODEL = "gemini-nano-banana-2.1";
export const IMAGE_USD = 0.0336;
export { geminiReady };

type Found = { data: string };
// The reply layout is not fully documented, so look for the first image anywhere in it.
export function findImage(value: unknown, depth = 0): Found | null {
  if (!value || typeof value !== "object" || depth > 12) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.data === "string" && o.data.length > 100 && (o.type === "image" || /^image\//.test(String(o.mime_type ?? o.mimeType ?? "")))) return { data: o.data };
  for (const child of Object.values(o)) {
    const found = findImage(child, depth + 1);
    if (found) return found;
  }
  return null;
}

async function generate(prompt: string) {
  let response: Response;
  try {
    response = await fetch(`${process.env.GEMINI_BASE_URL_TEST || "https://generativelanguage.googleapis.com"}/v1beta/interactions`, {
      method: "POST",
      headers: { "x-goog-api-key": key(), "Content-Type": "application/json", "Api-Revision": "2026-05-20" },
      body: JSON.stringify({ model: MODEL, input: prompt, response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: "4:5", image_size: "1K" } }),
      redirect: "error",
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new HttpError(502, "IMAGE_PROVIDER", "Gemini did not respond. Please try again.");
  }
  if (!response.ok) {
    console.error("[gemini]", response.status);
    if (response.status === 401 || response.status === 403) throw new HttpError(503, "AI_KEY", "The Gemini key was not accepted, or billing is off.");
    if (response.status === 429) throw new HttpError(503, "AI_BUSY", "Gemini is busy or out of quota. Please try again later.");
    throw new HttpError(502, "IMAGE_PROVIDER", "Gemini could not make that image.");
  }
  return response.json().catch(() => null) as Promise<unknown>;
}

const dir = () => resolve(/* turbopackIgnore: true */ process.env.MEDIA_DIR || ".media");
const NAME = /^[a-z0-9]{32}\.jpg$/;

export async function readMedia(name: string) {
  if (!NAME.test(name)) return null;
  return readFile(/* turbopackIgnore: true */ join(dir(), name)).catch(() => null);
}

/** Makes one image and stores it. The bytes are decoded and re-encoded, never saved as sent. */
export async function makeImage(actor: Actor, prompt: string) {
  if (!geminiReady()) throw new HttpError(503, "AI_NOT_SET", "Gemini is not set up on this server yet.");
  await requireBudget(actor.workspaceId, IMAGE_USD);
  const found = findImage(await generate(prompt));
  // Charged by Google once it answers, whether or not the picture is usable.
  await recordUse(actor, { provider: "gemini", model: MODEL, task: "image", images: 1, costUsd: IMAGE_USD });
  if (!found) throw new HttpError(422, "IMAGE_REFUSED", "Gemini did not return an image. Try a different description.");
  let jpeg: Buffer;
  try {
    jpeg = await sharp(Buffer.from(found.data, "base64"), { limitInputPixels: 30_000_000 }).rotate().resize(1080, 1350, { fit: "cover" }).jpeg({ quality: 86 }).toBuffer();
  } catch {
    throw new HttpError(502, "IMAGE_SHAPE", "Gemini sent a file we could not read.");
  }
  const name = `${randomBytes(16).toString("hex")}.jpg`;
  const folder = dir();
  await mkdir(/* turbopackIgnore: true */ folder, { recursive: true });
  // Written beside and renamed, so a half-written file is never served.
  await writeFile(/* turbopackIgnore: true */ join(folder, `${name}.part`), jpeg);
  await rename(/* turbopackIgnore: true */ join(folder, `${name}.part`), join(folder, name));
  const base = (process.env.MEDIA_PUBLIC_URL || `${(process.env.APP_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "")}/m`).replace(/\/$/, "");
  return { objectKey: name, url: `${base}/${name}`, bytes: jpeg.length, width: 1080, height: 1350 };
}
