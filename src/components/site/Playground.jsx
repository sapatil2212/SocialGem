"use client";

import { useRef, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { AnimatePresence, MotionConfig, motion, useDragControls } from "motion/react";
import { FiArrowLeft, FiArrowRight, FiImage, FiLock, FiMove } from "react-icons/fi";
import { FaFacebookF, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { z } from "zod";
import { BUSINESSES, DAYS, PLATFORMS } from "@/content/landing";

const ICONS = { facebook: FaFacebookF, instagram: FaInstagram, x: FaXTwitter };
const KEYS = Object.keys(PLATFORMS);

// X counts links as 23 and wide characters as 2. Close enough for a demo.
function xLength(text) {
  const short = text.replace(/https?:\/\/\S+/g, "a".repeat(23));
  let total = 0;
  for (const ch of short) total += ch.codePointAt(0) > 0x10ff ? 2 : 1;
  return total;
}

const lengthFor = (key, text) => (key === "x" ? xLength(text) : [...text].length);

const schema = z
  .object({
    business: z.string(),
    caption: z.string().trim().min(1, "Write something first."),
    platforms: z.array(z.string()).min(1, "Choose at least one platform."),
    photo: z.boolean(),
    day: z.number(),
    time: z.string().regex(/^\d\d:\d\d$/, "Choose a time."),
  })
  .superRefine((value, ctx) => {
    for (const key of value.platforms) {
      const over = lengthFor(key, value.caption) - PLATFORMS[key].limit;
      if (over > 0) {
        ctx.addIssue({ code: "custom", path: ["caption"], message: `${over} too many for ${PLATFORMS[key].name}.` });
      }
    }
    if (value.platforms.includes("instagram") && !value.photo) {
      ctx.addIssue({ code: "custom", path: ["photo"], message: "Instagram needs a photo or video." });
    }
  });

function Errors({ field }) {
  const messages = [...new Set(field.state.meta.errors.map((e) => e?.message).filter(Boolean))];
  return <p className="sg-error" role="status">{messages.join(" ")}</p>;
}

function Art({ kind }) {
  return (
    <svg className={`sg-art sg-art-${kind}`} viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {kind === "clinic" && (
        <>
          <circle cx="245" cy="60" r="92" fill="#fff" opacity=".18" />
          <path d="M110 62c22-18 37 2 50 2s28-20 50-2c24 20 5 62-6 92-7 20-22 18-25-4-3-19-8-25-19-25s-16 6-19 25c-3 22-18 24-25 4-11-30-30-72-6-92z" fill="#fff" />
        </>
      )}
      {kind === "cafe" && (
        <>
          <circle cx="160" cy="112" r="84" fill="#fff" opacity=".16" />
          <path d="M92 84h120v42a50 50 0 0 1-50 50h-20a50 50 0 0 1-50-50z" fill="#fff" />
          <path d="M212 96h14a22 22 0 0 1 0 44h-18" fill="none" stroke="#fff" strokeWidth="13" />
          <path d="M128 66c-9-14 9-20 0-36M160 66c-9-14 9-20 0-36" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
        </>
      )}
      {kind === "tailor" && (
        <>
          <path d="M0 150c80-70 150 40 320-50v100H0z" fill="#fff" opacity=".2" />
          <path d="M132 26h56l-10 44 50 108H92l50-108z" fill="#fff" />
          <path d="M118 124h84M106 152h108" stroke="#f2b02e" strokeWidth="6" />
        </>
      )}
    </svg>
  );
}

function Preview({ platform, business, caption, photo, ref }) {
  const Icon = ICONS[platform];
  const { name, limit } = PLATFORMS[platform];
  const used = lengthFor(platform, caption);
  return (
    <motion.article
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className={`sg-post sg-${platform}`}
      aria-label={`${name} preview`}
    >
      <header>
        <span className="sg-avatar">{business.account[0]}</span>
        <strong>{business.account}</strong>
        <Icon aria-hidden="true" />
      </header>
      {platform === "instagram" && photo && <Art kind={business.key} />}
      <p>{caption || <em>Your words appear here</em>}</p>
      {platform !== "instagram" && photo && <Art kind={business.key} />}
      {platform === "instagram" && !photo && <p className="sg-missing">Add a photo for Instagram</p>}
      <footer className={used > limit ? "is-over" : ""}>
        <span className="sg-meter"><i style={{ transform: `scaleX(${Math.min(1, used / limit)})` }} /></span>
        {used.toLocaleString("en-IN")} / {limit.toLocaleString("en-IN")}
      </footer>
    </motion.article>
  );
}

function Card({ item, onMove, onDropAt }) {
  const controls = useDragControls();
  const locked = item.status === "Published";
  return (
    <motion.li
      layout
      layoutId={item.id}
      drag={!locked}
      dragListener={false}
      dragControls={controls}
      dragSnapToOrigin
      dragMomentum={false}
      whileDrag={{ scale: 1.05, zIndex: 20 }}
      onDragEnd={(event) => {
        if ("clientX" in event) onDropAt(item.id, event.clientX, event.clientY);
      }}
      className={`sg-card ${locked ? "is-locked" : ""}`}
    >
      <div className="sg-card-top">
        <time>{item.time}</time>
        {locked ? (
          <FiLock aria-hidden="true" />
        ) : (
          <span className="sg-grip" onPointerDown={(e) => controls.start(e)} aria-hidden="true"><FiMove /></span>
        )}
      </div>
      <p>{item.caption}</p>
      <div className="sg-card-end">
        <span className="sg-dots" role="img" aria-label={item.platforms.map((k) => PLATFORMS[k].name).join(", ")}>
          {item.platforms.map((k) => <i key={k} className={`sg-${k}`} />)}
        </span>
        {locked ? (
          <span>Published</span>
        ) : (
          <span className="sg-move">
            <button type="button" aria-label="Move a day earlier" disabled={item.day === 0} onClick={() => onMove(item.id, item.day - 1)}><FiArrowLeft /></button>
            <button type="button" aria-label="Move a day later" disabled={item.day === 6} onClick={() => onMove(item.id, item.day + 1)}><FiArrowRight /></button>
          </span>
        )}
      </div>
    </motion.li>
  );
}

const FIRST = [
  { id: "a", day: 0, time: "09:00", caption: "We are open all week", platforms: ["facebook", "x"], status: "Published" },
  { id: "b", day: 2, time: "18:30", caption: "Meet the team", platforms: ["instagram"], status: "Scheduled" },
  { id: "c", day: 4, time: "11:00", caption: "Weekend offer", platforms: ["facebook", "instagram"], status: "Scheduled" },
];

export default function Playground() {
  const [items, setItems] = useState(FIRST);
  const [said, setSaid] = useState("");
  const nextId = useRef(1);
  const weekRef = useRef(null);

  const form = useForm({
    defaultValues: {
      business: "cafe",
      caption: BUSINESSES[1].caption,
      platforms: ["facebook", "instagram", "x"],
      photo: true,
      day: 5,
      time: "10:00",
    },
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      const id = `new-${nextId.current++}`;
      setItems((list) => [...list, { ...value, id, status: "Scheduled" }]);
      setSaid(`Scheduled for ${DAYS[value.day]} at ${value.time}. Find it on the week below.`);
    },
  });
  const values = useStore(form.store, (state) => state.values);
  const business = BUSINESSES.find((b) => b.key === values.business);

  const move = (id, day) => {
    setItems((list) => list.map((i) => (i.id === id && i.status !== "Published" ? { ...i, day } : i)));
    setSaid(`Moved to ${DAYS[day]}.`);
  };
  const dropAt = (id, x, y) => {
    for (const node of weekRef.current.querySelectorAll("[data-day]")) {
      const box = node.getBoundingClientRect();
      if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) {
        move(id, Number(node.dataset.day));
        return;
      }
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="sg-play">
        <form
          className="sg-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field name="business">
            {(field) => (
              <fieldset className="sg-choice">
                <legend>Your business</legend>
                {BUSINESSES.map((b) => (
                  <label key={b.key}>
                    <input
                      type="radio"
                      name="business"
                      checked={field.state.value === b.key}
                      onChange={() => {
                        field.handleChange(b.key);
                        form.setFieldValue("caption", b.caption);
                      }}
                    />
                    <span>{b.label}</span>
                  </label>
                ))}
              </fieldset>
            )}
          </form.Field>

          <form.Field name="caption">
            {(field) => (
              <div>
                <label className="sg-label" htmlFor="sg-caption">Post</label>
                <textarea
                  id="sg-caption"
                  rows={5}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <Errors field={field} />
              </div>
            )}
          </form.Field>

          <form.Field name="platforms">
            {(field) => (
              <fieldset className="sg-choice">
                <legend>Send to</legend>
                {KEYS.map((key) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={field.state.value.includes(key)}
                      onChange={(e) =>
                        field.handleChange(KEYS.filter((k) => (k === key ? e.target.checked : field.state.value.includes(k))))
                      }
                    />
                    <span>{PLATFORMS[key].name}{key === "x" && <small>in testing</small>}</span>
                  </label>
                ))}
                <Errors field={field} />
              </fieldset>
            )}
          </form.Field>

          <form.Field name="photo">
            {(field) => (
              <div className="sg-choice">
                <label>
                  <input type="checkbox" checked={field.state.value} onChange={(e) => field.handleChange(e.target.checked)} />
                  <span><FiImage aria-hidden="true" /> Sample photo</span>
                </label>
                <Errors field={field} />
              </div>
            )}
          </form.Field>

          <div className="sg-when">
            <form.Field name="day">
              {(field) => (
                <label>
                  Day
                  <select value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))}>
                    {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </label>
              )}
            </form.Field>
            <form.Field name="time">
              {(field) => (
                <label>
                  Time
                  <input type="time" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                  <Errors field={field} />
                </label>
              )}
            </form.Field>
            <form.Subscribe selector={(s) => s.canSubmit}>
              {(can) => <button className="sg-btn sg-btn-main" type="submit" disabled={!can}>Schedule post</button>}
            </form.Subscribe>
          </div>
          <p className="sg-said" aria-live="polite">{said}</p>
        </form>

        <div className="sg-previews">
          <AnimatePresence mode="popLayout" initial={false}>
            {values.platforms.map((key) => (
              <Preview key={key} platform={key} business={business} caption={values.caption} photo={values.photo} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      <ol className="sg-week" ref={weekRef} aria-label="Demo week">
        {DAYS.map((day, index) => (
          <li key={day} data-day={index} className="sg-day">
            <h3>{day}</h3>
            <ul>
              {items
                .filter((i) => i.day === index)
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((item) => <Card key={item.id} item={item} onMove={move} onDropAt={dropAt} />)}
            </ul>
          </li>
        ))}
      </ol>
      <p className="sg-small sg-week-note">
        Drag a card by its handle, or use the arrows. Monday is locked, because a published post should never go out again by accident.
      </p>
    </MotionConfig>
  );
}
