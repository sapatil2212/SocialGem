"use client";

import { useEffect, useRef, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { FiPause, FiPlay, FiRotateCcw } from "react-icons/fi";

const START = 7 * 60;
const END = 21 * 60;
const POSTS = [
  { id: "am", at: 8 * 60 + 30, platform: "facebook", name: "Facebook", text: "Doors open, kettle on" },
  { id: "noon", at: 12 * 60 + 15, platform: "instagram", name: "Instagram", text: "Today's thali, in one photo" },
  { id: "pm", at: 18 * 60, platform: "facebook", name: "Facebook", text: "Evening offer till nine" },
];
const FAULTS = [
  { key: "none", label: "Nothing goes wrong" },
  { key: "cut", label: "Cut the line mid-send" },
  { key: "account", label: "Disconnect Instagram" },
  { key: "outage", label: "Four-hour outage" },
];
const VERDICT = {
  none: "All three go out on time with nobody signed in.",
  cut: "The lunch post may have arrived, so SocialGem stops. A blind retry could post it twice. It is checked first.",
  account: "The lunch post fails loudly and is never sent anywhere else. Nothing comes off your plan.",
  outage: "Lunch is hours late, so it is held back. A lunch post at dinner is worse than none. Evening goes out as normal.",
};
const OUTAGE = [11 * 60 + 30, 15 * 60 + 30];

function statusOf(post, time, fault) {
  if (time < post.at) return "Scheduled";
  const broken = post.id === "noon" && fault !== "none";
  if (broken && fault === "outage") return time < OUTAGE[1] ? "Waiting" : "Missed";
  if (time < post.at + 22) return "Sending";
  if (!broken) return "Published";
  return fault === "cut" ? "Needs check" : "Failed";
}

const clock = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.floor(m % 60)).padStart(2, "0")}`;
const left = (m) => ((m - START) / (END - START)) * 100;

export default function Flight() {
  const [time, setTime] = useState(START);
  const [fault, setFault] = useState("none");
  const [playing, setPlaying] = useState(false);
  const timeRef = useRef(START);

  const jump = (next) => {
    const value = Math.max(START, Math.min(END, next));
    timeRef.current = value;
    setTime(value);
  };
  const jumpRef = useRef(jump);
  useEffect(() => {
    jumpRef.current = jump;
  });

  useEffect(() => {
    if (!playing) return;
    let frame;
    let last = performance.now();
    const step = (t) => {
      const next = timeRef.current + ((t - last) / 1000) * 85;
      last = t;
      jumpRef.current(next);
      if (next >= END) setPlaying(false);
      else frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const done = time >= END;
  const play = () => {
    if (done) jump(START);
    setPlaying((p) => (done ? true : !p));
  };
  const choose = (key) => {
    setFault(key);
    jump(START);
    setPlaying(true);
  };

  return (
    <MotionConfig reducedMotion="user">
      <section id="flight" className="sg-flight">
        <div className="sg-wrap">
          <header className="sg-head">
            <h2>See what happens when things go wrong</h2>
            <p>A simulation of how publishing is designed to behave. Run the day, drag the time, or break the lunch post.</p>
          </header>

          <div className="sg-console" data-ui>
            <div className="sg-faults" role="group" aria-label="Choose a fault">
              {FAULTS.map((f) => (
                <button key={f.key} type="button" aria-pressed={fault === f.key} onClick={() => choose(f.key)}>
                  {fault === f.key && <motion.i layoutId="fault" aria-hidden="true" />}
                  <span>{f.label}</span>
                </button>
              ))}
            </div>

            <div className="sg-clock">
              <button type="button" className="sg-playbtn" onClick={play} aria-label={done ? "Run again" : playing ? "Pause" : "Run the day"}>
                {done ? <FiRotateCcw /> : playing ? <FiPause /> : <FiPlay />}
              </button>
              <output>{clock(time)}</output>
            </div>

            <div className="sg-line-day">
              {fault === "outage" && (
                <span className="sg-outage" style={{ left: `${left(OUTAGE[0])}%`, width: `${left(OUTAGE[1]) - left(OUTAGE[0])}%` }} />
              )}
              <span className="sg-done" style={{ width: `${left(time)}%` }} />
              {POSTS.map((p) => (
                <span key={p.id} className={`sg-mark ${time >= p.at ? "is-past" : ""}`} style={{ left: `${left(p.at)}%` }} />
              ))}
              <input
                type="range"
                min={START}
                max={END}
                step={1}
                value={Math.round(time)}
                aria-label="Time of day"
                aria-valuetext={clock(time)}
                onChange={(e) => {
                  setPlaying(false);
                  jump(Number(e.target.value));
                }}
              />
            </div>

            <ol className="sg-flights">
              {POSTS.map((post) => {
                const status = statusOf(post, time, fault);
                return (
                  <li key={post.id} className={`sg-${post.platform}`} data-status={status}>
                    <div><time>{clock(post.at)}</time> {post.name}</div>
                    <p>{post.text}</p>
                    <motion.strong key={status} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{status}</motion.strong>
                  </li>
                );
              })}
            </ol>
            <p className="sg-verdict" aria-live="polite">{done ? VERDICT[fault] : " "}</p>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
