import { after } from "next/server";
import { jobInput, startJob } from "@/server/ai/studio";
import { guardWorkspace } from "@/server/guard";

export const POST = guardWorkspace({ body: jobInput, limit: { name: "studio-job", max: 40, seconds: 86400 } }, async ({ user, workspace, body }) => {
  const { job, run } = await startJob(workspace, user.id, body);
  after(run);
  return { job };
});
