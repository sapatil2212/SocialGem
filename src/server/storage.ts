import { randomBytes } from "node:crypto";
import { mkdir, open, rename, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { HttpError } from "./errors";

// Files on our own disk, served publicly at /m/<name> so the social platforms can fetch them.
// Names are 32 random hex characters, so they cannot be guessed or walked.

// STORAGE_PATH is the VPS name; MEDIA_DIR still works. Keep it outside the app folder.
export const storageDir = () => resolve(/* turbopackIgnore: true */ process.env.STORAGE_PATH || process.env.MEDIA_DIR || ".media");

export const TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
} as const;
type Ext = keyof typeof TYPES;

const NAME = /^[a-f0-9]{32}\.(jpg|png|webp|gif|mp4|mov|webm)$/;
export const MAX_IMAGE = 10 * 1024 * 1024;
export const MAX_VIDEO = 50 * 1024 * 1024;

/** The kind of file from its first bytes. The browser's own label is never trusted. */
export function sniff(head: Uint8Array): Ext | null {
  const at = (offset: number, ...bytes: number[]) => bytes.every((b, i) => head[offset + i] === b);
  const ascii = (offset: number, text: string) => at(offset, ...[...text].map((c) => c.charCodeAt(0)));
  if (at(0, 0xff, 0xd8, 0xff)) return "jpg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "webp";
  if (ascii(0, "GIF87a") || ascii(0, "GIF89a")) return "gif";
  if (at(0, 0x1a, 0x45, 0xdf, 0xa3)) return "webm";
  if (ascii(4, "ftyp")) return ascii(8, "qt  ") ? "mov" : "mp4";
  return null;
}

/**
 * Where stored files are served from. A configured https address wins. Otherwise the
 * site's own address, taken from a request whose origin the guard has already checked.
 */
export function mediaBase(checkedOrigin?: string | null) {
  const configured = (process.env.MEDIA_PUBLIC_URL || `${(process.env.APP_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "")}/m`).replace(/\/$/, "");
  if (configured.startsWith("https://") || !checkedOrigin) return configured;
  return `${checkedOrigin.replace(/\/$/, "")}/m`;
}

const isVideo =(ext: Ext) => ext === "mp4" || ext === "mov" || ext === "webm";

/** Writes beside and renames, so a half-written file is never served. */
export async function storeBytes(bytes: Buffer, ext: Ext) {
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  const folder = storageDir();
  await mkdir(/* turbopackIgnore: true */ folder, { recursive: true });
  await writeFile(/* turbopackIgnore: true */ join(folder, `${name}.part`), bytes);
  await rename(/* turbopackIgnore: true */ join(folder, `${name}.part`), join(/* turbopackIgnore: true */ folder, name));
  return name;
}

/**
 * Checks and stores one uploaded file. Photos are decoded and re-encoded, which drops
 * location data and anything hidden in them. GIFs and videos are kept as sent.
 */
export async function storeUpload(file: File) {
  if (!file.size) throw new HttpError(400, "EMPTY", "That file is empty.");
  if (file.size > MAX_VIDEO) throw new HttpError(413, "TOO_LARGE", "Files can be up to 50 MB.");
  const raw = Buffer.from(await file.arrayBuffer());
  const ext = sniff(raw.subarray(0, 16));
  if (!ext) throw new HttpError(415, "FILE_TYPE", "Upload a JPG, PNG, WebP or GIF image, or an MP4, MOV or WebM video.");
  if (!isVideo(ext) && raw.length > MAX_IMAGE) throw new HttpError(413, "TOO_LARGE", "Images can be up to 10 MB.");

  let bytes = raw;
  let width: number | null = null;
  let height: number | null = null;
  if (!isVideo(ext)) {
    try {
      const image = sharp(raw, { limitInputPixels: 50_000_000, animated: ext === "gif" });
      const meta = await image.metadata();
      width = meta.width ?? null;
      height = meta.pageHeight ?? meta.height ?? null;
      if (ext !== "gif") {
        const turned = image.rotate();
        bytes = await (ext === "png" ? turned.png() : ext === "webp" ? turned.webp({ quality: 90 }) : turned.jpeg({ quality: 90, mozjpeg: true })).toBuffer();
      }
    } catch {
      throw new HttpError(415, "FILE_BROKEN", "That image could not be read. Try saving it again as JPG or PNG.");
    }
  }
  const name = await storeBytes(bytes, ext);
  return { name, type: isVideo(ext) ? ("video" as const) : ("image" as const), contentType: TYPES[ext], size: bytes.length, width, height };
}

/** An open stored file, or null. Only names we made are ever looked up. */
export async function openStored(name: string) {
  const match = NAME.exec(name);
  if (!match) return null;
  const path = join(/* turbopackIgnore: true */ storageDir(), name);
  try {
    const info = await stat(/* turbopackIgnore: true */ path);
    if (!info.isFile()) return null;
    return { path, size: info.size, contentType: TYPES[match[1] as Ext], handle: () => open(/* turbopackIgnore: true */ path) };
  } catch {
    return null;
  }
}
