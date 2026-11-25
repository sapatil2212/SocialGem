import { guard, HttpError } from "@/server/guard";

// Uploads return in M3, straight to our own storage. The old route stored files
// with links that may expire within an hour, and needed no sign-in.
export const POST = guard({}, async () => {
  throw new HttpError(503, "UPLOADS_OFF", "Uploads are not switched on yet. Paste a public https link to your image or video instead.");
});
