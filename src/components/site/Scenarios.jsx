"use client";

import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { SCENARIOS } from "@/content/landing";

export default function Scenarios() {
  const [key, setKey] = useState("ok");
  const current = SCENARIOS.find((s) => s.key === key);

  return (
    <MotionConfig reducedMotion="user">
      <div className="sg-scenes">
        <div className="sg-scene-tabs" role="group" aria-label="Situations">
          {SCENARIOS.map((s) => (
            <button key={s.key} type="button" aria-pressed={s.key === key} onClick={() => setKey(s.key)}>
              {s.key === key && <motion.i layoutId="scene" aria-hidden="true" />}
              <span>{s.tab}</span>
            </button>
          ))}
        </div>
        <div className="sg-scene" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <ol className={`sg-track is-${current.end}`}>
                {current.steps.map((step, i) => (
                  <motion.li
                    key={step}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.28 }}
                  >
                    {step}
                  </motion.li>
                ))}
              </ol>
              <p>{current.text}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
