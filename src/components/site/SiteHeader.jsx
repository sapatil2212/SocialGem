"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { FiMoon, FiSun } from "react-icons/fi";
import { motion, useScroll, useSpring } from "motion/react";

export default function SiteHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });

  return (
    <header className="sg-top">
      <div className="sg-wrap sg-top-in">
        <Link href="/" className="sg-logo">
          <svg viewBox="0 0 32 28" width="26" height="23" aria-hidden="true">
            <path d="M8 1h16l7 9H1z" fill="var(--garnet)" />
            <path d="M1 10h10l5 17z" fill="var(--sapphire)" />
            <path d="M11 10h10l-5 17z" fill="var(--emerald)" />
            <path d="M21 10h10L16 27z" fill="var(--topaz)" />
          </svg>
          SocialGem
        </Link>
        <nav aria-label="Main">
          <a href="#try">Try it</a>
          <a href="#publishing">Publishing</a>
          <a href="#platforms">Platforms</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <button
          type="button"
          className="sg-icon"
          aria-label="Switch between light and dark"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <FiMoon className="sg-when-light" />
          <FiSun className="sg-when-dark" />
        </button>
        <Link href="/login" className="sg-signin">Sign in</Link>
      </div>
      <motion.div className="sg-progress" style={{ scaleX }} aria-hidden="true" />
    </header>
  );
}
