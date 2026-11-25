import { guard, notFound } from "@/server/guard";
import { disconnectAccount, ownAccount, renameAccount } from "@/server/muapi";
import { rename } from "@/server/schemas";

async function mine(userId: string, id: string) {
  const account = /^\d{1,15}$/.test(id) ? await ownAccount(userId, Number(id)) : null;
  if (!account) throw notFound();
  return account;
}

export const PATCH = guard({ body: rename, limit: { name: "account-edit", max: 60, seconds: 3600 } }, async ({ user, body, params }) => {
  const account = await mine(user.id, params.id);
  await renameAccount(account.id, body.accountName);
  return { ...account, account_name: body.accountName };
});

export const DELETE = guard({ limit: { name: "account-edit", max: 60, seconds: 3600 } }, async ({ user, params }) => {
  await disconnectAccount((await mine(user.id, params.id)).id);
  return { success: true };
});
