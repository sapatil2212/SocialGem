"use client";

import { useState, type PointerEvent, type ReactNode } from "react";
import { ArrowUp, Check, Copy } from "lucide-react";

function track(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== "mouse") return;
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--fx", `${event.clientX - box.left}px`);
  event.currentTarget.style.setProperty("--fy", `${event.clientY - box.top}px`);
}

export function FooterStage({ children }: { children: ReactNode }) {
  return (
    <footer onPointerMove={track} className="sg-footer relative overflow-hidden bg-navy text-white">
      <div aria-hidden className="sg-footer-grid" />
      <div aria-hidden className="sg-footer-glow" />
      {children}
    </footer>
  );
}

export function Wordmark() {
  return (
    <div aria-hidden className="container-1280 relative flex justify-between pb-2 select-none">
      {[..."SocialGem"].map((letter, i) => (
        <span key={i} className="sg-letter">{letter}</span>
      ))}
    </div>
  );
}

export function CopyEmail({ email }: { email: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={done ? "Email copied" : "Copy email address"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(email);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {}
      }}
      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
    >
      {done ? <Check className="size-4 text-emerald-300" /> : <Copy className="size-4" />}
      <span role="status" className="sr-only">{done ? "Email copied" : ""}</span>
    </button>
  );
}

export function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      className="group flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/15 px-4 font-medium text-white hover:bg-white/10"
    >
      Back to top <ArrowUp aria-hidden className="size-4 transition-transform group-hover:-translate-y-0.5" />
    </button>
  );
}
