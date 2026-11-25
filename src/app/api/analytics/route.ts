import { dataFor } from "@/server/data";
import { guard } from "@/server/guard";
import { listAccounts } from "@/server/muapi";

const DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 };
const POINTS: Record<string, number> = { "7d": 7, "30d": 14, "90d": 12, "365d": 12 };
const PLATFORMS = ["youtube", "tiktok", "instagram", "x_twitter", "linkedin", "facebook", "threads", "pinterest"];

// Our own counts only. Reach and engagement are not collected, so they are zero, never estimated.
export const GET = guard({}, async ({ user, query }) => {
  const range = query.get("range") && DAYS[query.get("range")!] ? query.get("range")! : "30d";
  const now = Date.now();
  const span = DAYS[range] * 86_400_000;
  const [posts, accounts] = await Promise.all([
    dataFor(user.id).posts.list(new Date(now - 2 * span), new Date(now)),
    listAccounts(user.id).catch(() => []),
  ]);
  const published = posts.filter((p) => p.status === "completed");
  const current = published.filter((p) => p.scheduledAt.getTime() >= now - span);
  const before = published.length - current.length;
  const change = before ? ((current.length - before) / before) * 100 : current.length ? 100 : 0;

  const step = span / POINTS[range];
  const growthSeries = Array.from({ length: POINTS[range] }, (_, i) => {
    const start = now - span + i * step;
    const inside = current.filter((p) => p.scheduledAt.getTime() >= start && p.scheduledAt.getTime() < start + step);
    const day = new Date(start + step / 2);
    return {
      date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      fullDate: day.toISOString().slice(0, 10),
      impressions: 0, reach: 0, interactions: 0, engagementRate: 0,
      postsCount: inside.length,
      ...Object.fromEntries(PLATFORMS.map((k) => [k, inside.filter((p) => p.platform === k).length])),
    };
  });
  const flat = growthSeries.map(() => 0);
  const none = { change: "0%", isPositive: true };

  return {
    range,
    kpis: {
      totalReach: { value: 0, formatted: "Not collected", ...none, sparkPoints: flat },
      avgEngagementRate: { value: 0, formatted: "Not collected", ...none, sparkPoints: flat },
      totalFollowers: { value: accounts.length, formatted: `${accounts.length} Channels`, ...none, sparkPoints: growthSeries.map(() => accounts.length) },
      publishedPosts: { value: current.length, formatted: String(current.length), change: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`, isPositive: change >= 0, sparkPoints: growthSeries.map((p) => p.postsCount) },
    },
    growthSeries,
    topPosts: current.slice(0, 50).map((p) => ({
      id: p.id, title: p.title || "Untitled Post", description: p.description || "", platform: p.platform, mediaUrl: p.mediaUrl,
      publishedUrl: p.publishedUrl, scheduledAt: p.scheduledAt, status: p.status,
      impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0, totalInteractions: 0, engagementRate: 0,
    })),
    connectedAccounts: accounts.map((a) => ({ id: a.id, platform_name: a.platform_name, account_name: a.account_name })),
  };
});
