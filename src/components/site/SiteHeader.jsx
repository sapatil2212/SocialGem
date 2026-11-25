"use client";

import { useState } from "react";
import Link from "next/link";
import { FiMenu, FiX } from "react-icons/fi";

const LINKS = [["#features", "Features"], ["#make", "Composer"], ["#flight", "Reliability"], ["#platforms", "Platforms"], ["#start", "Pricing"]];

export function Logo() {
  return (
    <>
      <svg viewBox="0 0 32 28" width="28" height="25" aria-hidden="true">
        <path d="M8 1h16l7 9H1z" fill="#6f8dff" />
        <path d="M1 10h10l5 17z" fill="#2d5bff" />
        <path d="M11 10h10l-5 17z" fill="#14308f" />
        <path d="M21 10h10L16 27z" fill="#2d5bff" />
      </svg>
      SocialGem
    </>
  );
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sg-top">
      <div className="sg-wrap">
        <Link href="/" className="sg-logo"><Logo /></Link>
        <nav aria-label="Main" id="sg-nav" className={open ? "is-open" : ""}>
          {LINKS.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
        </nav>
        <Link href="/login" className="sg-btn sg-btn-s sg-login">Log in</Link>
        <Link href="/app" className="sg-btn sg-btn-main sg-btn-s">Early preview</Link>
        <button type="button" className="sg-menu" aria-expanded={open} aria-controls="sg-nav" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
          {open ? <FiX /> : <FiMenu />}
        </button>
      </div>
    </header>
  );
}
