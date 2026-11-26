import { guardWorkspace } from "@/server/guard";
import { captionInput, writeCaptions } from "@/server/ai/create";

// Captions and hashtags for each chosen channel. Nothing is saved until the person approves.
export const POST = guardWorkspace({ body: captionInput, limit: { name: "create-captions", max: 120, seconds: 86400 } }, ({ user, workspace, body }) =>
  writeCaptions(workspace, user.id, body)
);
