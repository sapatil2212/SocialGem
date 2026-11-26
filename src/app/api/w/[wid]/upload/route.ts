import { guardWorkspace, HttpError } from "@/server/guard";
import { MAX_VIDEO, mediaBase, storeUpload } from "@/server/storage";

// Stored on our own disk (STORAGE_PATH) and served at /m/<random name>.
// The guard has checked sign-in, membership, role and that the request came from our own site.
export const POST = guardWorkspace({ limit: { name: "upload", max: 200, seconds: 3600 } }, async ({ request }) => {
  // Refused before reading, when the browser says up front that it is too large.
  if (Number(request.headers.get("content-length") || 0) > MAX_VIDEO + 1024 * 1024) throw new HttpError(413, "TOO_LARGE", "Files can be up to 50 MB.");
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) throw new HttpError(400, "INVALID", "Choose a file to upload.");
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    throw new HttpError(400, "INVALID", "The upload could not be read. Please try again.");
  }
  if (!(file instanceof File)) throw new HttpError(400, "INVALID", "Choose a file to upload.");

  const stored = await storeUpload(file);
  return {
    success: true,
    url: `${mediaBase(request.headers.get("origin"))}/${stored.name}`,
    type: stored.type,
    size: stored.size,
    width: stored.width,
    height: stored.height,
  };
});
