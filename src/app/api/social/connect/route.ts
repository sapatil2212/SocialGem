import { guard } from "@/server/guard";
import { connectUrl } from "@/server/muapi";
import { connect } from "@/server/schemas";

export const POST = guard({ body: connect, limit: { name: "connect", max: 20, seconds: 3600 } }, async ({ user, body }) => ({
  url: await connectUrl(user.id, body.platform),
}));
