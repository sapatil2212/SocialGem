"use client";

import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { FiBriefcase, FiCheck, FiImage } from "react-icons/fi";

const VERSIONS = [
  { key: "fb", label: "Facebook", Icon: FaFacebook, text: "New frames are in. Drop by before 8 pm and our optician will help you choose." },
  { key: "ig", label: "Instagram", Icon: FaInstagram, text: "New frames, same honest advice.\n\n#eyewear #punestyle" },
  { key: "x", label: "X", Icon: FaXTwitter, text: "New frames are in. Open till 8 tonight." },
];

function ComposeMini() {
  const [tab, setTab] = useState("fb");
  const current = VERSIONS.find((v) => v.key === tab);
  return (
    <div className="sg-mini">
      <div className="sg-mini-tabs" role="group" aria-label="Platform version">
        {VERSIONS.map(({ key, label, Icon }) => (
          <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>
            <Icon aria-hidden="true" /> {label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {current.text}
        </motion.p>
      </AnimatePresence>
      <div className="sg-mini-foot"><FiImage aria-hidden="true" /> 1 photo <span>{[...current.text].length} characters</span></div>
    </div>
  );
}

function CalendarMini() {
  const [picked, setPicked] = useState([4, 10, 18]);
  return (
    <div className="sg-mini">
      <div className="sg-mini-head"><strong>This month</strong><span>{picked.length} scheduled</span></div>
      <div className="sg-cal">
        {Array.from({ length: 28 }, (_, i) => {
          const on = picked.includes(i);
          return (
            <button
              key={i}
              type="button"
              aria-pressed={on}
              aria-label={`Day ${i + 1}`}
              onClick={() => setPicked((p) => (on ? p.filter((d) => d !== i) : [...p, i]))}
            >
              {i + 1}
              {on && <motion.i layoutId={`dot-${i}`} initial={{ scale: 0 }} animate={{ scale: 1 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const METERS = [["X", 280], ["Threads", 500], ["Instagram", 2200]];

function LimitMini() {
  const [length, setLength] = useState(240);
  return (
    <div className="sg-mini">
      <label className="sg-mini-head">
        <strong>Post length</strong><span>{length} characters</span>
        <input type="range" min="20" max="700" value={length} onChange={(e) => setLength(Number(e.target.value))} />
      </label>
      {METERS.map(([name, max]) => {
        const over = length > max;
        return (
          <div key={name} className={`sg-limit ${over ? "is-over" : ""}`}>
            <span>{name}</span>
            <div className="sg-meter"><i style={{ transform: `scaleX(${Math.min(1, length / max)})` }} /></div>
            <b>{over ? `${length - max} over` : "Fits"}</b>
          </div>
        );
      })}
    </div>
  );
}

const BRANDS = [
  { name: "Aarogya Dental", color: "#1b2240", posts: 6 },
  { name: "Filter & Co.", color: "#e0762d", posts: 11 },
  { name: "Meher Boutique", color: "#b8407a", posts: 4 },
];

function BrandMini() {
  const [at, setAt] = useState(0);
  return (
    <div className="sg-mini sg-brands">
      <div role="group" aria-label="Brand">
        {BRANDS.map((b, i) => (
          <button key={b.name} type="button" aria-pressed={at === i} onClick={() => setAt(i)}>
            <span style={{ background: b.color }}>{b.name[0]}</span>{b.name}{at === i && <FiCheck aria-hidden="true" />}
          </button>
        ))}
      </div>
      <motion.div key={at} className="sg-brand-now" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
        <FiBriefcase aria-hidden="true" />
        <b>{BRANDS[at].posts}</b>
        <span>posts this week, only for {BRANDS[at].name}</span>
      </motion.div>
    </div>
  );
}

const CARDS = [
  { tone: "sky", Demo: ComposeMini, title: "One post, a version for each platform", text: "Change the Instagram caption without touching the Facebook one." },
  { tone: "mint", Demo: CalendarMini, title: "See the whole month", text: "Pick a day, drag to move, and spot the gaps before your followers do." },
  { tone: "peach", Demo: LimitMini, title: "Know before you schedule", text: "Limits are checked as you type, so posts do not fail later." },
  { tone: "lilac", Demo: BrandMini, title: "A separate space for every brand", text: "Keep each client's accounts, media and calendar apart." },
];

export default function Features() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="sg-cards">
        {CARDS.map(({ tone, Demo, title, text }) => (
          <article key={title} className="sg-feature card-interactive reveal">
            <div className={`sg-stage-box is-${tone}`}><Demo /></div>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </MotionConfig>
  );
}

const ROLES = [
  { key: "shop", label: "Shops and cafés", title: "Plan on Monday, serve all week", points: ["Line up offers before the rush", "Reuse photos you already have", "Post while you are at the counter"], quote: "Monsoon menu is here. Open till 10 tonight.", color: "#e0762d" },
  { key: "clinic", label: "Clinics", title: "Stay visible between appointments", points: ["Share camps and timings early", "Keep a steady, calm presence", "Check every post before it goes"], quote: "Free check-ups for children this Saturday.", color: "#1b2240" },
  { key: "free", label: "Freelancers", title: "Show your work without losing a day", points: ["Batch a month in one sitting", "Adjust tone for each platform", "Export your posts any time"], quote: "Three logos, one brief. Here is how we chose.", color: "#178a63" },
  { key: "agency", label: "Small agencies", title: "Every client in its own space", points: ["Accounts never mix between clients", "Set a timezone per brand", "See failures across clients"], quote: "Client calendar ready for November.", color: "#b8407a" },
];

export function Roles() {
  const [key, setKey] = useState("shop");
  const role = ROLES.find((r) => r.key === key);
  return (
    <MotionConfig reducedMotion="user">
      <div className="sg-roles">
        <div className="sg-role-tabs" role="group" aria-label="Type of business">
          {ROLES.map((r) => (
            <button key={r.key} type="button" aria-pressed={r.key === key} onClick={() => setKey(r.key)}>
              {r.key === key && <motion.i layoutId="role" aria-hidden="true" />}
              <span>{r.label}</span>
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={key} className="sg-role" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div>
              <h3>{role.title}</h3>
              <ul>{role.points.map((p) => <li key={p}><FiCheck aria-hidden="true" />{p}</li>)}</ul>
            </div>
            <div className="sg-role-art" style={{ "--r": role.color }}>
              <div className="sg-role-card"><b>9:00 am</b><p>{role.quote}</p><span><FaFacebook aria-hidden="true" /><FaInstagram aria-hidden="true" /> Scheduled</span></div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
