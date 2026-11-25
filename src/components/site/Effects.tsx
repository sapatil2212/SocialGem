"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Scroll reveal for .reveal and the cursor spotlight for .card-interactive.
export default function Effects() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const nodes = [...document.querySelectorAll<HTMLElement>(".reveal")];
    for (const node of nodes) {
      if (node.getBoundingClientRect().top < window.innerHeight) node.classList.add("is-visible");
    }
    document.documentElement.classList.add("js-reveal");
    const watch = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting && entry.boundingClientRect.top > 0) continue;
          entry.target.classList.add("is-visible");
          watch.unobserve(entry.target);
        }
      },
      { threshold: 0.08 }
    );
    nodes.forEach((node) => watch.observe(node));

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return;
      const card = event.target.closest<HTMLElement>(".card-interactive");
      if (!card) return;
      const box = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - box.left}px`);
      card.style.setProperty("--my", `${event.clientY - box.top}px`);
    };
    document.addEventListener("pointermove", move, { passive: true });

    return () => {
      watch.disconnect();
      document.removeEventListener("pointermove", move);
      document.documentElement.classList.remove("js-reveal");
    };
  }, [pathname]);

  return null;
}
