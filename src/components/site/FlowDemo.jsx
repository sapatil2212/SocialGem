"use client";

import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { FiCheck, FiClock, FiEdit3, FiPlay } from "react-icons/fi";

const SAMPLE = "Fresh batch at 5 pm. First ten boxes get a free filter coffee.";
const ENDS = [
  { key: "facebook", name: "Facebook Page", Icon: FaFacebook, color: "#1877f2", shape: (t) => `${/[.!?]$/.test(t) ? t : `${t}.`} Message us to hold yours.` },
  { key: "instagram", name: "Instagram", Icon: FaInstagram, color: "#e1306c", shape: (t) => `${t} #localfavourite` },
  { key: "x", name: "X, in testing", Icon: FaXTwitter, color: "#111", shape: (t) => t },
];

function Flow({ text, run, onRun }) {
  const [on, setOn] = useState({ facebook: true, instagram: true, x: true });
  const active = ENDS.filter((e) => on[e.key]);
  return (
    <div className="sg-flow !mt-5" id="flow">
      <div className="sg-flow-bar">
        <strong>Demo run</strong>
        <span><FiClock aria-hidden="true" /> 5:00 pm, Asia/Kolkata</span>
        <button type="button" className="sg-btn sg-btn-main sg-btn-s" onClick={onRun} disabled={!active.length}>
          <FiPlay aria-hidden="true" /> Run
        </button>
      </div>
      <div className="sg-flow-map">
        <div className="sg-node sg-node-in">
          <span className="sg-node-icon" style={{ "--n": "#0f1239" }}><FiEdit3 /></span>
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
                    <FiCheck aria-hidden="true" /> Ready
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

export default function FlowDemo() {
  const [draft, setDraft] = useState("");
  const [run, setRun] = useState(0);
  return (
    <MotionConfig reducedMotion="user">
      <form className="sg-ask mx-auto" onSubmit={(e) => { e.preventDefault(); setRun((n) => n + 1); }}>
        <input type="text" aria-label="What would you post today?" value={draft} maxLength={200} placeholder="What would you post today?" autoComplete="off" onChange={(e) => setDraft(e.target.value)} />
        <button className="sg-btn sg-btn-main" type="submit">Run it</button>
      </form>
      <p className="mt-3 mb-6 text-center text-sm text-muted-ink">A demo. Nothing is sent anywhere.</p>
      <Flow text={draft.trim() || SAMPLE} run={run} onRun={() => setRun((n) => n + 1)} />
    </MotionConfig>
  );
}
