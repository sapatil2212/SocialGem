import { dataFor } from "@/server/data";
import { guard, HttpError } from "@/server/guard";
import { tag } from "@/server/schemas";

// Suggestions shown until the user makes their own. Nothing is written on read.
const SUGGESTED = [
  ["Launch", "#612bd3"], ["Promo", "#10b981"], ["Meme", "#f59e0b"], ["Case Study", "#06b6d4"], ["BTS", "#ec4899"], ["Announce", "#3b82f6"],
].map(([name, color]) => ({ id: `suggested-${name}`, name, color }));

export const GET = guard({}, async ({ user }) => {
  const own = await dataFor(user.id).tags.list();
  return own.length ? own : SUGGESTED;
});

export const POST = guard({ body: tag, limit: { name: "tag-save", max: 100, seconds: 3600 } }, async ({ user, body }) => {
  const { tags } = dataFor(user.id);
  if ((await tags.count()) >= 200) throw new HttpError(400, "LIMIT", "You have reached 200 tags.");
  return tags.save(body.name, body.color);
});
