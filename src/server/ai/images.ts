import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { HttpError } from "../errors";
import { mediaBase, openStored, storeBytes } from "../storage";
import { geminiKey as key, geminiReady } from "./ready";
import { recordUse, requireBudget, type Actor } from "./client";

// The only module that talks to Gemini. Same price as the Lite model at 1K, and the one Google recommends.
const MODEL = "gemini-nano-banana-2.1";
export const IMAGE_USD = 0.0336;
// Google's standard prices for this model. 2K is sharper and costs 50% more.
export const IMAGE_PRICES = { "1K": 0.0336, "2K": 0.0504 } as const;
export type ImageSize = keyof typeof IMAGE_PRICES;
const OUTPUT = { "1K": [1080, 1350], "2K": [2160, 2700] } as const;
/** A picture sent with the prompt, such as the brand logo. */
export type Reference = { mimeType: "image/png" | "image/jpeg" | "image/webp"; data: string };
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

async function generate(prompt: string, size: ImageSize, references: Reference[]) {
  const input = references.length
    ? [{ type: "text", text: prompt }, ...references.map((r) => ({ type: "image", mime_type: r.mimeType, data: r.data }))]
    : prompt;
  let response: Response;
  try {
    response = await fetch(`${process.env.GEMINI_BASE_URL_TEST || "https://generativelanguage.googleapis.com"}/v1beta/interactions`, {
      method: "POST",
      headers: { "x-goog-api-key": key(), "Content-Type": "application/json", "Api-Revision": "2026-05-20" },
      body: JSON.stringify({ model: MODEL, input, response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: "4:5", image_size: size } }),
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

export async function readMedia(name: string) {
  const file = await openStored(name);
  return file ? readFile(/* turbopackIgnore: true */ file.path).catch(() => null) : null;
}

/** Makes one image and stores it. The bytes are decoded and re-encoded, never saved as sent. */
export async function makeImage(actor: Actor, prompt: string, options: { size?: ImageSize; references?: Reference[] } = {}) {
  if (!geminiReady()) throw new HttpError(503, "AI_NOT_SET", "Gemini is not set up on this server yet.");
  const size = options.size ?? "1K";
  const cost = IMAGE_PRICES[size];
  const [width, height] = OUTPUT[size];
  await requireBudget(actor.workspaceId, cost);
  const found = findImage(await generate(prompt, size, options.references ?? []));
  // Charged by Google once it answers, whether or not the picture is usable.
  await recordUse(actor, { provider: "gemini", model: MODEL, task: "image", images: 1, costUsd: cost });
  if (!found) throw new HttpError(422, "IMAGE_REFUSED", "Gemini did not return an image. Try a different description.");
  let jpeg: Buffer;
  try {
    jpeg = await sharp(Buffer.from(found.data, "base64"), { limitInputPixels: 30_000_000 }).rotate().resize(width, height, { fit: "cover" }).jpeg({ quality: 88 }).toBuffer();
  } catch {
    throw new HttpError(502, "IMAGE_SHAPE", "Gemini sent a file we could not read.");
  }
  const name = await storeBytes(jpeg, "jpg");
  return { objectKey: name, url: `${mediaBase()}/${name}`, bytes: jpeg.length, width, height };
}
