"use client";

import Link from "next/link";
import { motion, useScroll, useSpring } from "motion/react";

export default function SiteHeader() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });

  return (
    <header className="sg-top" data-ui>
      <div className="sg-wrap">
        <Link href="/" className="sg-logo">
          <svg viewBox="0 0 32 28" width="26" height="23" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 2h16l6 8-14 16L2 10zM2 10h28M11 10l5 16 5-16M8 2l3 8 5-8 5 8 3-8" />
          </svg>
          SocialGem
        </Link>
        <nav aria-label="Main">
          <a href="#flight">Simulator</a>
          <a href="#make">Composer</a>
          <a href="#platforms">Platforms</a>
          <a href="#end">Pricing</a>
        </nav>
        <Link href="/login" className="sg-signin">Sign in</Link>
      </div>
      <motion.div className="sg-progress" style={{ scaleX }} aria-hidden="true" />
    </header>
  );
}
