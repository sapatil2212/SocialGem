"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Check, Clock } from "lucide-react";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import Logo from "@/components/site/Logo";

const EASE = [0.22, 1, 0.36, 1] as const;
const POSTS = [
  { id: 1, day: "Mon", time: "09:00", text: "Doors open, kettle on", Icon: FaFacebook },
  { id: 2, day: "Wed", time: "12:15", text: "Today's thali, in one photo", Icon: FaInstagram },
  { id: 3, day: "Fri", time: "18:00", text: "Weekend offer till nine", Icon: FaFacebook },
];

// A small live queue: pressing a card publishes it.
function Queue() {
  const [done, setDone] = useState<number[]>([1]);
  return (
    <div className="mt-12 grid max-w-md gap-3">
      {POSTS.map(({ id, day, time, text, Icon }, i) => {
        const on = done.includes(id);
        return (
          <motion.button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => setDone((d) => (on ? d.filter((x) => x !== id) : [...d, id]))}
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.45, ease: EASE }}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            className="glass-dark flex cursor-pointer items-center gap-4 rounded-2xl p-4 text-left"
          >
            <Icon aria-hidden className="size-6 shrink-0 text-[#5cd6ff]" />
            <span className="min-w-0 flex-1">
              <b className="block truncate font-semibold">{text}</b>
              <span className="text-sm text-white/70">{day}, {time}</span>
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={on ? "on" : "off"}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold ${on ? "bg-brand text-white" : "bg-white/10"}`}
              >
                {on ? <Check aria-hidden className="size-4" /> : <Clock aria-hidden className="size-4" />}
                {on ? "Published" : "Scheduled"}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}

export default function AuthShell({ children }: { children: ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 50, damping: 18 });
  const sy = useSpring(y, { stiffness: 50, damping: 18 });
  const nx = useTransform(sx, (v) => -v);
  const ny = useTransform(sy, (v) => -v);

  return (
    <MotionConfig reducedMotion="user">
      <div className="grid min-h-dvh lg:grid-cols-2">
        <aside
          className="relative hidden overflow-hidden bg-navy p-14 text-white lg:flex lg:flex-col"
          onPointerMove={(e) => {
            if (e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
            const box = e.currentTarget.getBoundingClientRect();
            x.set(((e.clientX - box.left) / box.width - 0.5) * 70);
            y.set(((e.clientY - box.top) / box.height - 0.5) * 70);
          }}
        >
          <motion.div aria-hidden style={{ x: sx, y: sy }} className="absolute -top-32 -right-24 size-[30rem] rounded-full bg-[#7c22e8]/45 blur-[110px]" />
          <motion.div aria-hidden style={{ x: nx, y: ny }} className="absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-[#0aa5ff]/30 blur-[110px]" />
          <Link href="/" className="relative w-fit" aria-label="SocialGem home"><Logo tone="dark" className="h-14" /></Link>
          <div className="relative my-auto py-10">
            <h2 className="max-w-md text-5xl">Post like you have <em className="accent text-[#c9a8ff]">a whole team</em></h2>
            <Queue />
            <p className="mt-5 text-white/70">A sample week. Press a post to publish it.</p>
          </div>
        </aside>
        <main className="flex flex-col px-6 py-8 sm:px-14">
          <Link href="/" className="w-fit lg:invisible" aria-label="SocialGem home"><Logo /></Link>
          <motion.div
            className="m-auto w-full max-w-sm py-10"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </MotionConfig>
  );
}
