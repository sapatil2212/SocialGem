import Link from "next/link";
import { BadgeCheck, Building2, Share2, Users } from "lucide-react";
import { Badge, Heading, when } from "@/components/admin/parts";
import { adminHealth, adminOverview, requireAdmin } from "@/server/admin";

const card = "rounded-2xl border border-hairline bg-card p-6";

export default async function Page() {
  await requireAdmin();
  const [data, health] = await Promise.all([adminOverview(), adminHealth()]);
  const max = Math.max(1, ...data.signups.map((d) => d.count));
  const total = data.signups.reduce((sum, d) => sum + d.count, 0);
  const stats = [
    { label: "Users", value: data.users, note: `${data.disabled} disabled`, Icon: Users },
    { label: "Confirmed emails", value: data.verified, note: `${data.users - data.verified} waiting`, Icon: BadgeCheck },
    { label: "Workspaces", value: data.workspaces, note: "Active", Icon: Building2 },
    { label: "Channels", value: data.channels, note: "Connected", Icon: Share2 },
  ];
  return (
    <>
      <Heading title="Overview" text="What is happening across SocialGem." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, note, Icon }) => (
          <div key={label} className={card}>
            <div className="flex items-center justify-between text-muted-ink">{label}<span className="grid size-10 place-items-center rounded-xl bg-tint-strong text-brand-ink"><Icon aria-hidden className="size-5" /></span></div>
            <b className="mt-2 block text-4xl font-semibold tabular-nums">{value.toLocaleString("en-IN")}</b>
            <span className="text-sm text-muted-ink">{note}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <section className={card}>
          <h2 className="!text-lg">Sign-ups, last 14 days</h2>
          <p className="mt-1 text-sm text-muted-ink">{total} in total</p>
          <ol className="mt-6 flex h-48 items-end gap-1.5 sm:gap-2.5">
            {data.signups.map((d) => (
              <li key={d.day} title={`${d.day}: ${d.count}`} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5 text-center text-xs text-muted-ink">
                <span className="tabular-nums">{d.count || ""}</span>
                <span aria-hidden className="gradient-brand rounded-t-md" style={{ height: `${Math.max(2, (d.count / max) * 78)}%`, opacity: d.count ? 1 : 0.2 }} />
                <span aria-hidden>{d.day.slice(8)}</span><span className="sr-only">{d.day}: {d.count}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className={card}>
          <h2 className="!text-lg">System</h2>
          <p className="mt-1 text-sm text-muted-ink">Database answered in {health.ms} ms</p>
          <ul className="mt-4 grid gap-3">
            {health.checks.map((c) => <li key={c.name} className="flex items-center justify-between">{c.name}<Badge tone={c.ok ? "good" : "warn"}>{c.ok ? "Ready" : "Not set"}</Badge></li>)}
          </ul>
        </section>
        <section className={card}>
          <div className="flex items-center justify-between"><h2 className="!text-lg">Newest users</h2><Link href="/admin/users" className="text-sm font-semibold text-brand-ink">All users</Link></div>
          <ul className="mt-4 grid gap-3">
            {data.latest.map((u) => <li key={u.id} className="flex items-center justify-between gap-4"><span className="min-w-0"><b className="block truncate font-medium">{u.name || "No name"}</b><span className="block truncate text-sm text-muted-ink">{u.email}</span></span><time className="shrink-0 text-sm text-muted-ink">{when(u.createdAt)}</time></li>)}
          </ul>
        </section>
        <section className={card}>
          <h2 className="!text-lg">Posts by status</h2>
          {data.targets.length ? <ul className="mt-4 grid gap-3">{data.targets.map((t) => <li key={t.status} className="flex justify-between"><span className="capitalize">{t.status.toLowerCase().replace("_", " ")}</span><b className="tabular-nums">{t.count}</b></li>)}</ul> : <p className="mt-4 text-muted-ink">No posts yet.</p>}
        </section>
      </div>
    </>
  );
}
