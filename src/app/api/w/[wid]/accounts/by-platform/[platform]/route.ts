import { z } from "zod";
import { showAccount, syncAccounts } from "@/server/accounts";
import { dataFor, toPlatform } from "@/server/data";
import { guardWorkspace, HttpError } from "@/server/guard";

// Facebook and Instagram Pages share one Meta login, so they are switched off and on together.
// Only in SocialGem: MuAPI is never asked to disconnect anything.
const SHARED = z.enum(["facebook", "instagram"]);
const options = { limit: { name: "account-edit", max: 60, seconds: 3600 }, roles: ["OWNER", "ADMIN"] as ("OWNER" | "ADMIN")[] };

function platformOf(value: string | undefined) {
  const parsed = SHARED.safeParse(value);
  if (!parsed.success) throw new HttpError(400, "PLATFORM", "That platform is switched off one account at a time.");
  return toPlatform(parsed.data);
}

export const DELETE = guardWorkspace(options, async ({ workspace, params }) => {
  const { count } = await dataFor(workspace.id).accounts.disconnectPlatform(platformOf(params.platform));
  return { success: true, count };
});

export const POST = guardWorkspace(options, async ({ workspace, params }) => {
  const platform = platformOf(params.platform);
  await dataFor(workspace.id).accounts.enablePlatform(platform);
  await syncAccounts(workspace, 0);
  return (await dataFor(workspace.id).accounts.listAll()).map(showAccount);
});
