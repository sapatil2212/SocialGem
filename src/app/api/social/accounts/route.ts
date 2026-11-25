import { guard } from "@/server/guard";
import { listAccounts } from "@/server/muapi";

export const GET = guard({ limit: { name: "accounts", max: 600, seconds: 3600 } }, ({ user }) => listAccounts(user.id));
