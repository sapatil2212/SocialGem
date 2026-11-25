"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "motion/react";
import { ArrowRight, CalendarClock, CircleCheck, FilePenLine, Plus, Share2 } from "lucide-react";
import { FaFacebook, FaInstagram, FaLinkedin, FaPinterest, FaYoutube } from "react-icons/fa";
import { FaThreads, FaXTwitter } from "react-icons/fa6";
import { SiTiktok } from "react-icons/si";
import { Button } from "@/components/ui/button";

type Post = { id: string; title?: string; description?: string; platform: string; status: string; scheduledAt?: string | null };
type Channel = { id: string; platform: string; accountName?: string };
type Props = { posts: Post[]; accounts: Channel[]; loading: boolean; onNew: () => void; onOpen: (post: Post) => void };

const ICONS: Record<string, typeof FaFacebook> = { facebook: FaFacebook, instagram: FaInstagram, linkedin: FaLinkedin, pinterest: FaPinterest, youtube: FaYoutube, threads: FaThreads, x_twitter: FaXTwitter, tiktok: SiTiktok };

export default function Overview({ posts, accounts, loading, onNew, onOpen }: Props) {
  const { data } = useSession();
  const first = data?.user?.name?.trim().split(/\s+/)[0];
  const count = (status: string) => posts.filter((p) => p.status === status).length;
  const upcoming = posts
    .filter((p) => p.status === "scheduled" && p.scheduledAt && new Date(p.scheduledAt) > new Date())
    .sort((a, b) => +new Date(a.scheduledAt!) - +new Date(b.scheduledAt!));
  const stats = [
    { label: "Scheduled", value: count("scheduled"), Icon: CalendarClock, tone: "bg-[#e8f1ff] text-[#1559b8] dark:bg-sky-400/15 dark:text-sky-300" },
    { label: "Drafts", value: count("draft"), Icon: FilePenLine, tone: "bg-cream text-warning dark:bg-amber-400/15" },
    { label: "Published", value: count("completed"), Icon: CircleCheck, tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300" },
    { label: "Channels", value: accounts.length, Icon: Share2, tone: "bg-tint-strong text-brand-ink" },
  ];

  return (
    <div className="grid gap-4">
      <section className="sg-welcome">
        <div className="relative max-w-xl">
          <h2 className="!text-[clamp(1.35rem,2.2vw,1.7rem)]">{first ? `Hello, ${first}` : "Hello"}</h2>
          <p className="mt-1.5 text-sm text-white/80">
            {loading ? "Getting your week ready." : upcoming.length ? `${upcoming.length} ${upcoming.length === 1 ? "post is" : "posts are"} lined up next.` : "Nothing is lined up yet. Start with one post."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={onNew} className="bg-white text-navy hover:bg-[#ece6ff]"><Plus /> Create post</Button>
            {!accounts.length && !loading && <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:border-white/60"><Link href="/integrations">Connect a channel</Link></Button>}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({ label, value, Icon, tone }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.35 }} className="flex items-center gap-3 rounded-xl border border-hairline bg-card p-3.5 sm:p-4">
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone}`}><Icon aria-hidden className="size-5" /></span>
            <span><span className="block text-sm text-muted-ink">{label}</span><b className="text-xl leading-tight font-semibold tabular-nums">{loading ? <span aria-label="Loading" className="mt-1 block h-6 w-9 animate-pulse rounded-md bg-tint-strong motion-reduce:animate-none" /> : value}</b></span>
          </motion.div>
        ))}
      </div>

      {!loading && (
        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <section className="rounded-xl border border-hairline bg-card p-4">
            <h2 className="!text-base">Up next</h2>
            {upcoming.length ? (
              <ul className="mt-3 grid gap-1">
                {upcoming.slice(0, 3).map((post) => {
                  const Icon = ICONS[post.platform] ?? Share2;
                  return (
                    <li key={post.id}>
                      <button type="button" onClick={() => onOpen(post)} className="flex min-h-11 w-full text-sm cursor-pointer items-center gap-3 rounded-xl px-2 text-left hover:bg-tint">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-tint-strong text-brand-ink"><Icon aria-hidden /></span>
                        <span className="min-w-0 flex-1 truncate font-medium">{post.title || post.description || "Untitled post"}</span>
                        <time dateTime={post.scheduledAt!} className="shrink-0 text-sm text-muted-ink">{new Date(post.scheduledAt!).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</time>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-ink">Scheduled posts will appear here in time order.</p>
            )}
          </section>
          <section className="rounded-xl border border-hairline bg-card p-4">
            <div className="flex items-center justify-between"><h2 className="!text-base">Channels</h2><Link href="/integrations" className="flex min-h-9 items-center gap-1 text-sm font-semibold text-brand-ink">Manage <ArrowRight aria-hidden className="size-4" /></Link></div>
            {accounts.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {accounts.slice(0, 8).map((a) => {
                  const Icon = ICONS[a.platform] ?? Share2;
                  return <li key={a.id} className="flex max-w-full items-center gap-2 rounded-xl border border-hairline px-3 py-2 text-sm"><Icon aria-hidden className="shrink-0 text-brand-ink" /><span className="truncate">{a.accountName || a.platform}</span></li>;
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-ink">No channels yet. Connect Facebook or Instagram to begin.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
