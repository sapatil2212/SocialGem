"use client";

import { type PointerEvent, type ReactNode } from "react";
import { ArrowUp } from "lucide-react";

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

export function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      aria-label="Back to top"
      title="Back to top"
      className="group grid size-11 cursor-pointer place-items-center rounded-full border border-white/20 text-white hover:border-white/50 hover:bg-white/10"
    >
      <ArrowUp aria-hidden className="size-4 transition-transform group-hover:-translate-y-0.5" />
    </button>
  );
}
