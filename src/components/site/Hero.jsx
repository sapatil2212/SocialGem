"use client";

import { useState } from "react";
import { AnimatePresence, MotionConfig, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { FaFacebook, FaInstagram, FaLinkedin, FaPinterest, FaYoutube } from "react-icons/fa";
import { FaThreads, FaXTwitter } from "react-icons/fa6";
import { SiTiktok } from "react-icons/si";
import { FiArrowRight, FiCheck, FiClock, FiEdit3, FiPlay } from "react-icons/fi";

const TILES = [
  { Icon: FaFacebook, color: "#1877f2", x: 6, y: 12, depth: 18 },
  { Icon: FaXTwitter, color: "#111", x: 20, y: 2, depth: 10 },
  { Icon: FaInstagram, color: "#e1306c", x: 13, y: 44, depth: 26 },
  { Icon: FaLinkedin, color: "#0a66c2", x: 3, y: 74, depth: 12 },
  { Icon: FaYoutube, color: "#f00", x: 80, y: 2, depth: 14 },
  { Icon: FaThreads, color: "#111", x: 91, y: 22, depth: 22 },
  { Icon: SiTiktok, color: "#111", x: 83, y: 48, depth: 12 },
  { Icon: FaPinterest, color: "#e60023", x: 94, y: 76, depth: 24 },
];

const SAMPLE = "Fresh batch at 5 pm. First ten boxes get a free filter coffee.";
const ENDS = [
  { key: "facebook", name: "Facebook Page", Icon: FaFacebook, color: "#1877f2", shape: (t) => `${/[.!?]$/.test(t) ? t : `${t}.`} Message us to hold yours.` },
  { key: "instagram", name: "Instagram", Icon: FaInstagram, color: "#e1306c", shape: (t) => `${t} #localfavourite` },
  { key: "x", name: "X, in testing", Icon: FaXTwitter, color: "#111", shape: (t) => t },
];

function Tile({ tile, mx, my }) {
  const x = useTransform(mx, (v) => v * tile.depth);
  const y = useTransform(my, (v) => v * tile.depth);
  const { Icon } = tile;
  return (
    <motion.span className="sg-tile" style={{ left: `${tile.x}%`, top: `${tile.y}%`, x, y, color: tile.color }}>
      <Icon />
    </motion.span>
  );
}

function Flow({ text, run, onRun }) {
  const [on, setOn] = useState({ facebook: true, instagram: true, x: true });
  const active = ENDS.filter((e) => on[e.key]);
  return (
    <div className="sg-flow" id="flow">
      <div className="sg-flow-bar">
        <strong>Demo run</strong>
        <span><FiClock aria-hidden="true" /> 5:00 pm, Asia/Kolkata</span>
        <button type="button" className="sg-btn sg-btn-main sg-btn-s" onClick={onRun} disabled={!active.length}>
          <FiPlay aria-hidden="true" /> Run
        </button>
      </div>
      <div className="sg-flow-map">
        <div className="sg-node sg-node-in">
          <span className="sg-node-icon" style={{ "--n": "#1b2240" }}><FiEdit3 /></span>
          <strong>Your post</strong>
          <p>{text}</p>
        </div>
        <svg className="sg-wires" viewBox="0 0 400 420" preserveAspectRatio="none" aria-hidden="true">
          {ENDS.map((e, i) => {
            const d = `M0 210 C 190 210 200 ${70 + i * 140} 400 ${70 + i * 140}`;
            return (
              <g key={e.key} className={on[e.key] ? "" : "is-off"}>
                <path d={d} />
                {run > 0 && on[e.key] && (
                  <motion.path
                    key={run}
                    d={d}
                    className="sg-pulse"
                    style={{ stroke: e.color }}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.9, delay: 0.15 * i, ease: "easeInOut" }}
                  />
                )}
              </g>
            );
          })}
        </svg>
        <div className="sg-ends">
          {ENDS.map((e, i) => (
            <div key={e.key} className={`sg-node ${on[e.key] ? "" : "is-off"}`}>
              <div className="sg-node-top">
                <span className="sg-node-icon" style={{ "--n": e.color }}><e.Icon /></span>
                <strong>{e.name}</strong>
                <label className="sg-switch">
                  <input
                    type="checkbox"
                    checked={on[e.key]}
                    aria-label={`Send to ${e.name}`}
                    onChange={(ev) => setOn((s) => ({ ...s, [e.key]: ev.target.checked }))}
                  />
                  <span />
                </label>
              </div>
              <p>{e.shape(text)}</p>
              <AnimatePresence mode="wait" initial={false}>
                {run > 0 && on[e.key] && (
                  <motion.span
                    key={run}
                    className="sg-ok"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.95 + i * 0.15 }}
                  >
                    <FiCheck aria-hidden="true" /> Published
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  const [draft, setDraft] = useState("");
  const [run, setRun] = useState(0);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 60, damping: 18 });
  const my = useSpring(rawY, { stiffness: 60, damping: 18 });

  return (
    <MotionConfig reducedMotion="user">
      <section
        className="sg-hero mesh-bg"
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          rawX.set(e.clientX / window.innerWidth - 0.5);
          rawY.set(e.clientY / window.innerHeight - 0.5);
        }}
      >
        <div className="sg-tiles" aria-hidden="true">
          {TILES.map((tile, i) => <Tile key={i} tile={tile} mx={mx} my={my} />)}
        </div>
        <div className="sg-wrap sg-hero-in">
          <h1>Schedule a week of posts in <em className="accent gradient-text">one sitting</em></h1>
          <p className="sg-lead">
            Write once, adjust it for each platform, and let SocialGem publish on time. Made for small businesses, and still in development.
          </p>
          <form
            className="sg-ask"
            onSubmit={(e) => {
              e.preventDefault();
              setRun((n) => n + 1);
              document.getElementById("flow").scrollIntoView({ block: "center" });
            }}
          >
            <input
              type="text"
              aria-label="What would you post today?"
              value={draft}
              maxLength={200}
              placeholder="What would you post today?"
              autoComplete="off"
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="sg-btn sg-btn-main" type="submit">Try it <FiArrowRight aria-hidden="true" /></button>
          </form>
          <ul className="sg-checks">
            <li><FiCheck aria-hidden="true" /> No sign-up for the demo</li>
            <li><FiCheck aria-hidden="true" /> Nothing is sent anywhere</li>
          </ul>
        </div>
        <div className="sg-wrap">
          <Flow text={draft.trim() || SAMPLE} run={run} onRun={() => setRun((n) => n + 1)} />
        </div>
      </section>
    </MotionConfig>
  );
}
