"use client";

import Link from "next/link";
import { MotionConfig, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { FaFacebook, FaInstagram, FaLinkedin, FaPinterest, FaYoutube } from "react-icons/fa";
import { FaThreads, FaXTwitter } from "react-icons/fa6";
import { SiBluesky, SiMastodon, SiSubstack, SiTiktok } from "react-icons/si";
import { MdStorefront } from "react-icons/md";
import { Button } from "@/components/ui/button";

const ORBIT = [
  { Icon: FaFacebook, color: "#1877f2", left: "8%", top: "15%", depth: 30 },
  { Icon: FaXTwitter, color: "#111", left: "17%", top: "39%", depth: 16 },
  { Icon: FaLinkedin, color: "#0a66c2", left: "5%", top: "58%", depth: 24 },
  { Icon: FaInstagram, color: "#d62f6c", left: "89%", top: "13%", depth: 34 },
  { Icon: FaYoutube, color: "#e00", left: "81%", top: "37%", depth: 18 },
  { Icon: SiTiktok, color: "#111", left: "93%", top: "56%", depth: 26 },
];

export default function HeroStage() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 55, damping: 18 });
  const sy = useSpring(y, { stiffness: 55, damping: 18 });

  return (
    <MotionConfig reducedMotion="user">
      <section
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

        <div className="sg-wrap sg-stage-body relative grid justify-items-center text-center">
          <h1 className="sg-hero-title text-white">Your social presence, <em className="accent sg-prism">planned in one sitting</em></h1>
          <p className="sg-hero-lead text-white/75">Write once, shape it for every channel and see the whole week at a glance. SocialGem keeps small teams consistent without living inside five apps.</p>
          <div className="sg-hero-cta flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="shimmer bg-white text-navy hover:bg-[#ece6ff]"><Link href="/signup">Start free <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/8 text-white hover:border-white/60"><a href="#calendar">See how it works</a></Button>
          </div>
          <ul className="sg-hero-points flex flex-wrap justify-center text-white/75">
            {["No card needed", "Ready in minutes", "India time by default"].map((t) => <li key={t} className="flex items-center gap-2"><Check aria-hidden className="text-[#22d3ee]" />{t}</li>)}
          </ul>
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

// [icon, name, tile colour, connectable today]
const NETWORKS = [
  [FaLinkedin, "LinkedIn", "#2867b2", false],
  [FaThreads, "Threads", "#000000", false],
  [FaPinterest, "Pinterest", "#e60023", false],
  [SiBluesky, "Bluesky", "#1185fe", false],
  [FaYoutube, "YouTube", "#ff0000", true],
  [FaXTwitter, "X", "#000000", false],
  [MdStorefront, "Google Business Profile", "#4c8bf5", false],
  [FaInstagram, "Instagram", "#e4127b", true],
  [SiSubstack, "Substack", "#ff6719", false],
  [SiMastodon, "Mastodon", "#6364ff", false],
  [SiTiktok, "TikTok", "#000000", true],
  [FaFacebook, "Facebook", "#1877f2", true],
] as const;

export function NetworkStrip() {
  return (
    <div className="sg-wrap py-5">
      <div className="reveal flex flex-col gap-6 rounded-[1.75rem] bg-[#f0eee8] px-6 py-5 sm:px-8 xl:flex-row xl:items-center xl:justify-between">
        <div className="shrink-0 xl:max-w-[16rem]">
          <h2 className="!text-[1.6rem] !leading-[1.2] font-medium text-[#1d2433] sm:!text-[1.75rem]">Connect your<br className="max-xl:hidden" /> favorite accounts</h2>
        </div>
        <ul className="grid max-w-lg grid-cols-6 gap-3 sm:gap-4 xl:flex xl:max-w-none xl:flex-nowrap xl:gap-2.5">
          {NETWORKS.map(([Icon, name, colour]) => (
            <li key={name} title={name} className="group relative">
              <span
                className="grid aspect-square w-full place-items-center rounded-xl text-white shadow-[0_8px_18px_-8px_rgba(20,25,45,0.45)] transition-transform duration-200 group-hover:-translate-y-1 xl:size-12"
                style={{ backgroundColor: colour }}
              >
                <Icon aria-hidden className="size-[45%]" />
              </span>
              <span className="sr-only">{name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
