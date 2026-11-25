import { dataFor } from "@/server/data";
import { guard } from "@/server/guard";
import { createMedia } from "@/server/schemas";

const SYSTEM = ["All Media", "Post Uploads", "Thumbnails", "Reels & Shorts", "Campaigns", "Brand Assets"];

export const GET = guard({}, async ({ user, query }) => {
  const assets = await dataFor(user.id).media.list();
  const folder = query.get("folder") || "All Media";
  const type = query.get("type") || "all";
  const search = (query.get("search") || "").trim().toLowerCase().slice(0, 100);
  const names = [...new Set([...SYSTEM, ...assets.map((a) => a.folder)])];
  const filtered = assets.filter(
    (a) =>
      (folder === "All Media" || a.folder === folder) &&
      (type === "all" || a.type === type) &&
      (!search || a.name.toLowerCase().includes(search) || (a.tags || "").toLowerCase().includes(search))
  );
  return {
    assets: filtered,
    folders: names.map((name) => ({ name, count: name === "All Media" ? assets.length : assets.filter((a) => a.folder === name).length })),
    totalCount: assets.length,
    filteredCount: filtered.length,
  };
});

export const POST = guard({ body: createMedia, limit: { name: "media-create", max: 200, seconds: 3600 } }, async ({ user, body }) => ({
  success: true,
  asset: await dataFor(user.id).media.create(body),
}));
