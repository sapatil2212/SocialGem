"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight, CalendarDays, Check, ChartNoAxesColumn, Image as ImageIcon, MousePointerClick, Plus, Share2, Sparkles } from "lucide-react";
import { FaFacebook, FaInstagram, FaLinkedin, FaPinterest, FaYoutube } from "react-icons/fa";
import { FaThreads, FaXTwitter } from "react-icons/fa6";
import { SiTiktok } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Mark } from "./Logo";

const EASE = [0.22, 1, 0.36, 1] as const;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const KINDS = [
  { key: "facebook", name: "Facebook", Icon: FaFacebook, tone: "bg-[#e8f1ff] text-[#1559b8] border-[#c4dcff]" },
  { key: "instagram", name: "Instagram", Icon: FaInstagram, tone: "bg-[#ffe9f4] text-[#b01466] border-[#ffc9e3]" },
] as const;
const IDEAS = ["Team photo", "Weekend offer", "Customer story", "Behind the counter", "New arrivals"];

type Item = { id: number; day: number; kind: number; time: string; text: string };
const START: Item[] = [
  { id: 1, day: 0, kind: 0, time: "09:00", text: "Doors open, kettle on" },
  { id: 2, day: 1, kind: 1, time: "12:30", text: "Today's thali" },
  { id: 3, day: 2, kind: 1, time: "18:00", text: "New frames are in" },
  { id: 4, day: 3, kind: 0, time: "10:15", text: "Saturday camp" },
  { id: 5, day: 4, kind: 1, time: "17:00", text: "Festive window" },
  { id: 6, day: 0, kind: 1, time: "19:00", text: "Evening special" },
  { id: 7, day: 2, kind: 0, time: "20:00", text: "Customer story" },
  { id: 8, day: 4, kind: 0, time: "18:30", text: "Weekend offer" },
];

function CalendarView() {
  const [items, setItems] = useState(START);
  const next = useRef(9);
  return (
    <div className="grid h-full grid-cols-3 gap-2 sm:grid-cols-5">
      {DAYS.map((day, d) => (
        <div key={day} className={cn("flex min-w-0 flex-col gap-2 rounded-xl border border-hairline bg-[#fcfbff] p-1.5 sm:p-2", d > 2 && "max-sm:hidden")}>
          <span className="px-1 text-xs font-semibold text-muted-ink">{day}</span>
          <AnimatePresence initial={false} mode="popLayout">
            {items.filter((i) => i.day === d).map((item) => {
              const kind = KINDS[item.kind];
              return (
                <motion.button
                  layout
                  key={item.id}
                  type="button"
                  aria-label={`Remove ${item.text}, ${day} ${item.time}`}
                  onClick={() => setItems((all) => all.filter((i) => i.id !== item.id))}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className={cn("cursor-pointer rounded-lg border p-1.5 text-left text-[11px] leading-tight sm:p-2", kind.tone)}
                >
                  <span className="flex items-center gap-1 font-semibold"><kind.Icon aria-hidden className="size-3 shrink-0" /><span className="truncate">{item.time}</span></span>
                  <span className="mt-1 block truncate">{item.text}</span>
                </motion.button>
              );
            })}
          </AnimatePresence>
          {items.filter((i) => i.day === d).length < 3 && (
            <button
              type="button"
              aria-label={`Add a sample post on ${day}`}
              onClick={() => {
                const id = next.current++;
                setItems((all) => [...all, { id, day: d, kind: id % 2, time: `${10 + (id % 9)}:00`, text: IDEAS[id % IDEAS.length] }]);
              }}
              className="grid min-h-8 cursor-pointer place-items-center rounded-lg border border-dashed border-[#cbbdf0] text-brand-ink hover:bg-tint"
            >
              <Plus aria-hidden className="size-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function ComposeView() {
  const [text, setText] = useState("Fresh batch at 5 pm. First ten boxes get a free filter coffee.");
  const [kind, setKind] = useState(1);
  const current = KINDS[kind];
  return (
    <div className="grid h-full gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-xl border border-hairline p-3">
        <div className="flex gap-2">
          {KINDS.map((k, i) => (
            <button key={k.key} type="button" aria-pressed={i === kind} onClick={() => setKind(i)} className={cn("flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold", i === kind ? k.tone : "border-hairline text-muted-ink")}>
              <k.Icon aria-hidden />{k.name}
            </button>
          ))}
        </div>
        <textarea aria-label="Sample caption" value={text} maxLength={160} onChange={(e) => setText(e.target.value)} className="!mt-0 min-h-24 flex-1 resize-none text-sm" />
        <span className="text-xs text-muted-ink tabular-nums">{text.length} of 160 in this demo</span>
      </div>
      <div className="rounded-xl border border-hairline p-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><current.Icon aria-hidden className="text-lg" /> Your business</div>
        <div aria-hidden className="mt-3 aspect-[2/1] rounded-lg bg-[linear-gradient(120deg,#22d3ee,#6d28d9_55%,#ec4899)]" />
        <p className="mt-3 text-sm [overflow-wrap:anywhere]">{text || "Write something to see it here."}</p>
      </div>
    </div>
  );
}

function ChannelsView() {
  const [on, setOn] = useState([true, false]);
  return (
    <div className="grid h-full content-start gap-3 sm:grid-cols-2">
      {KINDS.map((k, i) => (
        <div key={k.key} className="rounded-xl border border-hairline p-4">
          <span className={cn("grid size-11 place-items-center rounded-xl border text-xl", k.tone)}><k.Icon aria-hidden /></span>
          <strong className="mt-3 block">{k.name}</strong>
          <p className="text-sm text-muted-ink">{i ? "Business or Creator account" : "Facebook Page"}</p>
          <button type="button" aria-pressed={on[i]} onClick={() => setOn((s) => s.map((v, x) => (x === i ? !v : v)))} className={cn("mt-4 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold", on[i] ? "bg-emerald-100 text-emerald-800" : "bg-brand text-white")}>
            {on[i] ? <><Check aria-hidden className="size-4" /> Connected</> : "Connect"}
          </button>
        </div>
      ))}
    </div>
  );
}

const VIEWS = [
  { key: "calendar", label: "Calendar", Icon: CalendarDays, View: CalendarView },
  { key: "compose", label: "Composer", Icon: Sparkles, View: ComposeView },
  { key: "channels", label: "Channels", Icon: Share2, View: ChannelsView },
] as const;

function Product() {
  const [view, setView] = useState(0);
  const { View, label } = VIEWS[view];
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/50 bg-card text-foreground shadow-[0_50px_120px_-30px_rgb(20_5_80/0.75)]">
      <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
        <span aria-hidden className="flex gap-1.5"><i className="size-2.5 rounded-full bg-[#ff6d6d]" /><i className="size-2.5 rounded-full bg-[#ffc84a]" /><i className="size-2.5 rounded-full bg-[#3fcf7a]" /></span>
        <span className="mx-auto rounded-lg bg-tint px-4 py-1 text-xs text-muted-ink">Interactive sample workspace</span>
      </div>
      <div className="grid sm:grid-cols-[176px_1fr]">
        <div className="flex gap-1 border-b border-hairline p-3 sm:flex-col sm:border-r sm:border-b-0">
          <span className="mb-3 hidden items-center gap-2 px-2 font-semibold sm:flex"><Mark className="size-7" />Asha&apos;s brand</span>
          {VIEWS.map(({ key, label: name, Icon }, i) => (
            <button key={key} type="button" aria-pressed={view === i} onClick={() => setView(i)} className="relative flex min-h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-1.5 text-sm sm:flex-none sm:gap-2 sm:px-2.5 sm:justify-start">
              {view === i && <motion.span layoutId="hero-view" className="absolute inset-0 rounded-lg bg-tint-strong" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
              <Icon aria-hidden className="relative size-4 shrink-0 text-brand-ink max-sm:hidden" /><span className={cn("relative", view === i && "font-semibold")}>{name}</span>
            </button>
          ))}
          <span aria-hidden className="mt-2 hidden gap-1 opacity-45 sm:grid">
            <span className="flex min-h-10 items-center gap-2 px-2.5 text-sm"><ChartNoAxesColumn className="size-4" />Analytics</span>
            <span className="flex min-h-10 items-center gap-2 px-2.5 text-sm"><ImageIcon className="size-4" />Media</span>
          </span>
        </div>
        <div className="p-3 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <strong className="text-lg">{label}</strong>
            <span className="flex items-center gap-1.5 text-xs text-muted-ink"><MousePointerClick aria-hidden className="size-3.5" />Try it</span>
          </div>
          <div className="min-h-[290px] sm:h-[310px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={label} className="h-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: EASE }}>
                <View />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

const ORBIT = [
  { Icon: FaFacebook, color: "#1877f2", left: "8%", top: "15%", depth: 30 },
  { Icon: FaXTwitter, color: "#111", left: "17%", top: "39%", depth: 16 },
  { Icon: FaLinkedin, color: "#0a66c2", left: "5%", top: "58%", depth: 24 },
  { Icon: FaInstagram, color: "#d62f6c", left: "89%", top: "13%", depth: 34 },
  { Icon: FaYoutube, color: "#e00", left: "81%", top: "37%", depth: 18 },
  { Icon: SiTiktok, color: "#111", left: "93%", top: "56%", depth: 26 },
];

export default function HeroStage() {
  const ref = useRef<HTMLElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 55, damping: 18 });
  const sy = useSpring(y, { stiffness: 55, damping: 18 });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const tilt = useTransform(scrollYProgress, [0, 0.75], [15, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.75], [0.95, 1]);

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={ref}
        className="sg-stage"
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          x.set(e.clientX / innerWidth - 0.5);
          y.set(e.clientY / innerHeight - 0.5);
        }}
      >
        <div aria-hidden className="sg-aurora"><i /><i /><i /></div>
        <div aria-hidden className="sg-stage-grid" />
        <div aria-hidden className="absolute inset-x-0 top-0 mx-auto hidden h-[640px] max-w-[1440px] xl:block">
          {ORBIT.map((o, i) => <Float key={i} {...o} mx={sx} my={sy} index={i} />)}
        </div>

        <div className="sg-wrap relative grid justify-items-center pt-14 text-center sm:pt-20">
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-1.5 text-sm text-white/85">
            <i aria-hidden className="size-2 rounded-full bg-[#22d3ee]" /> Early access, free to try
          </motion.p>
          <h1 className="mt-7 text-white">Your social presence, <em className="accent sg-prism">planned in one sitting</em></h1>
          <p className="mt-6 max-w-2xl text-base text-white/75 sm:text-lg">Write once, shape it for every channel and see the whole week at a glance. SocialGem keeps small teams consistent without living inside five apps.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="shimmer bg-white text-navy hover:bg-[#ece6ff]"><Link href="/signup">Start free <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/8 text-white hover:border-white/60"><a href="#make">Try the composer</a></Button>
          </div>
          <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/70">
            {["No card needed", "Ready in minutes", "India time by default"].map((t) => <li key={t} className="flex items-center gap-2"><Check aria-hidden className="size-4 text-[#22d3ee]" />{t}</li>)}
          </ul>
        </div>

        <div className="sg-wrap relative mt-10 pb-18 [perspective:1600px] sm:mt-12">
          <motion.div style={{ rotateX: tilt, scale }} className="mx-auto max-w-[940px] origin-top"><Product /></motion.div>
        </div>
      </section>
    </MotionConfig>
  );
}

function Float({ Icon, color, left, top, depth, mx, my, index }: (typeof ORBIT)[number] & { mx: ReturnType<typeof useSpring>; my: ReturnType<typeof useSpring>; index: number }) {
  const x = useTransform(mx, (v: number) => v * depth);
  const y = useTransform(my, (v: number) => v * depth);
  return (
    <motion.span style={{ left, top, x, y, color }} className="absolute">
      <span className="sg-bob grid size-14 place-items-center rounded-2xl bg-white text-2xl shadow-[0_18px_40px_-12px_rgb(0_0_0/0.5)]" style={{ animationDelay: `${index * -0.9}s` }}><Icon /></span>
    </motion.span>
  );
}

const NETWORKS = [
  [FaFacebook, "Facebook"], [FaInstagram, "Instagram"], [FaXTwitter, "X"], [FaLinkedin, "LinkedIn"], [FaThreads, "Threads"], [FaYoutube, "YouTube"], [SiTiktok, "TikTok"], [FaPinterest, "Pinterest"],
] as const;

export function NetworkStrip() {
  return (
    <div className="border-b border-hairline bg-card py-8">
      <p className="mb-5 text-center text-sm text-muted-ink">Facebook and Instagram first. More channels are on the way.</p>
      <div className="marquee-wrap overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
        <div className="marquee">
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1} className="flex flex-wrap justify-center sm:flex-nowrap">
              {[...NETWORKS, ...NETWORKS].map(([Icon, name], i) => (
                <span key={i} aria-hidden={i >= NETWORKS.length} className={cn("flex items-center gap-3 px-7 text-base font-semibold whitespace-nowrap text-[#3c4063]", i >= NETWORKS.length && "max-sm:hidden")}><Icon aria-hidden />{name}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
