"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { MotionConfig, motion, useScroll, useTransform } from "motion/react";
import { FaFacebookF, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { FiArrowDown } from "react-icons/fi";
import { pulse } from "./fx";

const SAMPLE = "Fresh batch at 5 pm. First ten boxes get a free filter coffee.";
const OUTPUTS = [
  { key: "facebook", name: "Facebook Page", Icon: FaFacebookF, shape: (t) => `${t}\n\nMessage us to hold yours.` },
  { key: "instagram", name: "Instagram", Icon: FaInstagram, shape: (t) => `${t}\n\n#openlate #localfavourite` },
  { key: "x", name: "X, in testing", Icon: FaXTwitter, shape: (t) => ([...t].length > 280 ? `${[...t].slice(0, 279).join("")}…` : t) },
];

function Output({ progress, index, output, text }) {
  const start = 0.2 + index * 0.05;
  const opacity = useTransform(progress, [start, start + 0.12], [0, 1]);
  const x = useTransform(progress, [start, start + 0.16], [60, 0]);
  const { Icon } = output;
  return (
    <motion.article style={{ opacity, x }} className={`sg-out sg-${output.key}`}>
      <header><Icon aria-hidden="true" /> {output.name}</header>
      <p>{output.shape(text)}</p>
    </motion.article>
  );
}

export default function Story() {
  const [draft, setDraft] = useState("");
  const prismRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: prismRef, offset: ["start end", "end start"] });
  const text = draft.trim() || SAMPLE;

  return (
    <MotionConfig reducedMotion="user">
      <section id="hero" className="sg-hero">
        <div className="sg-wrap">
          <motion.h1 initial="off" animate="on" transition={{ staggerChildren: 0.12 }}>
            {["Put one", "thought in.", "Get it everywhere."].map((line) => (
              <span className="sg-line" key={line}>
                <motion.span
                  variants={{ off: { y: "105%" }, on: { y: 0 } }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </motion.h1>
          <div className="sg-prompt" data-ui>
            <label htmlFor="sg-thought">What would you post today?</label>
            <input
              id="sg-thought"
              type="text"
              value={draft}
              maxLength={220}
              placeholder={SAMPLE}
              autoComplete="off"
              onChange={(e) => {
                setDraft(e.target.value);
                pulse(0.32);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                pulse(1.2);
                document.getElementById("prism").scrollIntoView();
              }}
            />
            <a href="#prism" className="sg-send" aria-label="See it split for each platform" onClick={() => pulse(1.2)}>
              <FiArrowDown />
            </a>
          </div>
          <p className="sg-sub">
            SocialGem is a scheduler for shops, clinics and small agencies. Type above, then scroll.
          </p>
        </div>
      </section>

      <section id="prism" className="sg-prism" ref={prismRef}>
        <div className="sg-prism-stick">
          <div className="sg-wrap">
            <div className="sg-prism-copy">
              <h2>It leaves as three</h2>
              <p>Same thought, shaped for where it lands. Edit any version without touching the others.</p>
              <a className="sg-btn" href="#make">Build a real one</a>
            </div>
            <div className="sg-outs" data-ui>
              {OUTPUTS.map((output, i) => (
                <Output key={output.key} progress={scrollYProgress} index={i} output={output} text={text} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}

export function PreviewLink() {
  return (
    <Link className="sg-btn sg-btn-main" href="/app" onPointerEnter={() => pulse(0.8)}>
      Open early preview
    </Link>
  );
}
