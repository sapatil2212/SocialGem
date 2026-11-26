"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRight, Check, CircleAlert, ImagePlus, LoaderCircle, Link2, RefreshCw, Send, Sparkles, Upload, Wand2, X } from "lucide-react";
import { FaFacebook, FaInstagram, FaLinkedin, FaPinterest, FaYoutube } from "react-icons/fa";
import { FaThreads, FaXTwitter } from "react-icons/fa6";
import { SiTiktok } from "react-icons/si";
import { inWorkspace } from "@/lib/workspace-client";
import { cn } from "@/lib/utils";
import LiveDevicePreview from "./LiveDevicePreview";

// Create post, step by step: channels, the picture, the words, then approve.
// The AI drafts everything; nothing is posted until the person approves it.

const PLATFORMS = {
  facebook: { name: "Facebook", Icon: FaFacebook, color: "text-[#1877f2]", limit: 2000 },
  instagram: { name: "Instagram", Icon: FaInstagram, color: "text-[#e1306c]", limit: 2200 },
  x_twitter: { name: "X", Icon: FaXTwitter, color: "text-foreground", limit: 280 },
  linkedin: { name: "LinkedIn", Icon: FaLinkedin, color: "text-[#0a66c2]", limit: 3000 },
  threads: { name: "Threads", Icon: FaThreads, color: "text-foreground", limit: 500 },
  youtube: { name: "YouTube", Icon: FaYoutube, color: "text-[#ff0000]", limit: 4500 },
  tiktok: { name: "TikTok", Icon: SiTiktok, color: "text-foreground", limit: 150 },
  pinterest: { name: "Pinterest", Icon: FaPinterest, color: "text-[#e60023]", limit: 500 },
};
const VIDEO_ONLY = ["youtube", "tiktok"];
const NEEDS_TITLE = ["youtube", "pinterest"];
const TONES = ["Friendly", "Professional", "Playful", "Bold", "Informative"];
const STARTERS = ["A festive offer for this weekend", "Introduce our team", "Show our best-selling product", "Thank our customers"];
const STEPS = ["Channels", "Creative", "Captions", "Approve"];

const isVideo = (url) => /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(url || "");
const keyOf = (account) => {
  const p = (account.platform_name || "").toLowerCase();
  return p === "x" || p === "twitter" ? "x_twitter" : p;
};
const fullText = (post) => [post.caption.trim(), post.hashtags.join(" ")].filter(Boolean).join("\n\n");
const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

async function call(path, body) {
  const res = await fetch(inWorkspace(path), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

const field = "w-full rounded-lg border border-hairline bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-ink/70 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";
const primary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-hover cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-hairline bg-card px-4 text-sm font-medium text-foreground transition-colors hover:border-brand/40 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";
const Spinner = ({ className }) => <LoaderCircle aria-hidden className={cn("animate-spin motion-reduce:animate-none", className)} />;

export default function CreateFlow({ date = null, onDone, onClassic }) {
  const [step, setStep] = useState(0);
  const [accounts, setAccounts] = useState(null);
  const [chosen, setChosen] = useState([]);
  const [pick, setPick] = useState({});
  const [media, setMedia] = useState({ url: "", source: "" });
  const [mode, setMode] = useState("ai");
  const [about, setAbout] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [tone, setTone] = useState(TONES[0]);
  const [posts, setPosts] = useState({});
  const [writing, setWriting] = useState("");
  const [written, setWritten] = useState("");
  const [focus, setFocus] = useState("");
  const [when, setWhen] = useState(() => {
    const d = date ? new Date(date) : new Date(Date.now() + 86_400_000);
    return { later: true, day: localDay(d), time: "10:00" };
  });
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const requestKey = useRef(typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
  const fileInput = useRef(null);
  const chatEnd = useRef(null);

  useEffect(() => {
    fetch(inWorkspace("/accounts"))
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => setAccounts(Array.isArray(rows) ? rows : []))
      .catch(() => setAccounts([]));
  }, []);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  // One card per channel. A channel with several accounts (say, several Facebook pages)
  // posts to the one picked; accounts that need reconnecting are shown but cannot be used.
  const channels = useMemo(() => {
    const byKey = new Map();
    for (const a of accounts || []) {
      const key = keyOf(a);
      if (!PLATFORMS[key]) continue;
      if (!byKey.has(key)) byKey.set(key, { active: [], stale: [] });
      byKey.get(key)[a.connected === false ? "stale" : "active"].push(a);
    }
    return [...byKey.entries()].map(([key, { active, stale }]) => ({
      key, active, stale, ...PLATFORMS[key],
      account: active.find((a) => String(a.id) === pick[key]) ?? active[0] ?? stale[0],
    }));
  }, [accounts, pick]);

  // What the AI should know about the post, from the chat or the notes.
  const brief = useMemo(() => {
    const said = messages.filter((m) => m.role === "user").map((m) => m.text).join("\n");
    return [about.trim(), said].filter(Boolean).join("\n").slice(0, 3000);
  }, [about, messages]);
  const signature = JSON.stringify([chosen, media.url, brief, tone]);

  const problems = useMemo(() => {
    const list = [];
    for (const p of chosen) {
      const name = PLATFORMS[p].name;
      if (VIDEO_ONLY.includes(p) && !isVideo(media.url)) list.push(`${name} only accepts video. Upload a video, or untick ${name}.`);
      if (p === "instagram" && !media.url) list.push("Instagram needs a picture or video.");
      if (p === "youtube" && posts.youtube && !posts.youtube.title.trim()) list.push("YouTube needs a title.");
      const post = posts[p];
      if (post && fullText(post).length > PLATFORMS[p].limit) list.push(`The ${name} post is too long.`);
    }
    return list;
  }, [chosen, media.url, posts]);

  // ---- Captions ----
  const writeAll = async (only) => {
    setError("");
    setWriting(only || "all");
    try {
      const data = await call("/create/captions", { platforms: chosen, about: brief, tone, mediaUrl: media.url, ...(only ? { only } : {}) });
      setPosts((prev) => {
        const next = only ? { ...prev } : {};
        for (const p of data.posts) next[p.platform] = { title: p.title, caption: p.caption, hashtags: p.hashtags };
        return next;
      });
      if (!only) setWritten(signature);
    } catch (e) {
      setError(e.message);
    } finally {
      setWriting("");
    }
  };

  const go = (to) => {
    setError("");
    setStep(to);
    if (to === 2) {
      if (!focus || !chosen.includes(focus)) setFocus(chosen[0]);
      // Written once for this picture and brief; changing either writes them again.
      if (written !== signature) writeAll();
    }
  };

  // ---- Creative ----
  const send = async (text) => {
    const said = (text ?? draft).trim();
    if (!said || thinking) return;
    const history = [...messages, { role: "user", text: said }];
    setMessages(history);
    setDraft("");
    setThinking(true);
    setError("");
    try {
      const data = await call("/create/chat", { platforms: chosen, messages: history.slice(-30).map(({ role, text, imageUrl }) => ({ role, text, ...(imageUrl ? { imageUrl } : {}) })) });
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply, imageUrl: data.image?.url }]);
      if (data.image?.url) setMedia({ url: data.image.url, source: "ai" });
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: e.message, failed: true }]);
    } finally {
      setThinking(false);
    }
  };

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(inWorkspace("/upload"), { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "The upload failed.");
      setMedia({ url: data.url, source: "upload" });
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  // ---- Saving ----
  const save = async (kind) => {
    setError("");
    setSaving(kind);
    try {
      const first = posts[chosen[0]] || { title: "", caption: "", hashtags: [] };
      const platformAccountMap = Object.fromEntries(chosen.map((p) => [p, String(channels.find((c) => c.key === p)?.account.id ?? "")]));
      const platformOverrides = Object.fromEntries(chosen.map((p) => [p, { title: posts[p]?.title ?? "", description: posts[p] ? fullText(posts[p]) : "" }]));
      const at = kind === "schedule" ? new Date(`${when.day}T${when.time}:00`) : null;
      if (at && at.getTime() < Date.now()) throw new Error("That time has already passed. Choose a later time, or post now.");
      const res = await fetch(inWorkspace("/posts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: kind,
          requestKey: requestKey.current,
          platforms: chosen,
          platformAccountMap,
          platformOverrides,
          title: first.title,
          description: fullText(first),
          tags: "",
          mediaUrl: media.url,
          scheduledAt: at ? at.toISOString() : null,
          privacy: "public",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The post was not saved.");
      toast.success(kind === "draft" ? "Saved as a draft" : kind === "now" ? "Sent for publishing" : "Approved and scheduled");
      onDone?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving("");
    }
  };

  const setPost = (p, change) => setPosts((prev) => ({ ...prev, [p]: { ...prev[p], ...change } }));
  const canNext = [
    chosen.length > 0,
    Boolean(media.url) || (!chosen.some((p) => VIDEO_ONLY.includes(p) || p === "instagram") && brief.trim().length > 0),
    chosen.every((p) => posts[p]?.caption?.trim()) && !writing,
    true,
  ][step];
  const nextHint = [
    "Choose at least one channel.",
    media.url ? "" : chosen.some((p) => VIDEO_ONLY.includes(p) || p === "instagram") ? "Add a picture or video first." : "Add a picture, or say what the post is about.",
    writing ? "Writing your captions…" : "Every channel needs a caption.",
    "",
  ][step];

  const preview = focus && posts[focus] && (
    <LiveDevicePreview
      platform={focus}
      selectedPlatforms={chosen}
      onSelectPlatform={setFocus}
      title={posts[focus].title}
      description={fullText(posts[focus])}
      tags=""
      placeholders={false}
      mediaUrl={media.url}
      accountName={channels.find((c) => c.key === focus)?.account.account_name}
    />
  );

  return (
    <div className="p-3 sm:p-5">
      <div className="brand-themed flex flex-col overflow-hidden rounded-2xl border border-hairline bg-card text-foreground shadow-sm lg:h-[calc(100dvh-62px-2.5rem)]">
        {/* Steps */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3 sm:px-5">
          <ol className="flex items-center gap-1.5 sm:gap-2" aria-label="Steps">
            {STEPS.map((name, i) => {
              const done = i < step;
              const on = i === step;
              return (
                <li key={name} className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    disabled={i > step}
                    onClick={() => go(i)}
                    aria-current={on ? "step" : undefined}
                    className={cn("inline-flex min-h-8 items-center gap-2 rounded-full pr-2.5 pl-1 text-sm transition-colors", on ? "bg-tint font-medium text-foreground" : done ? "text-foreground hover:bg-tint cursor-pointer" : "text-muted-ink")}
                  >
                    <span className={cn("grid size-6 place-items-center rounded-full text-xs font-semibold", on || done ? "bg-brand text-white" : "border border-hairline")}>
                      {done ? <Check aria-hidden className="size-3.5" /> : i + 1}
                    </span>
                    <span className={cn(!on && "max-sm:sr-only")}>{name}</span>
                  </button>
                  {i < STEPS.length - 1 && <span aria-hidden className="h-px w-3 bg-hairline sm:w-6" />}
                </li>
              );
            })}
          </ol>
          {onClassic && (
            <button type="button" onClick={onClassic} className="text-xs font-medium text-muted-ink hover:text-foreground cursor-pointer">
              Use the full editor
            </button>
          )}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-background/60">
          {step === 0 && (
            <div className="mx-auto max-w-3xl p-4 sm:p-6">
              <h2 className="!text-xl !tracking-tight">Where should this post go?</h2>
              <p className="mt-1 text-sm text-muted-ink">Pick one or more channels. The AI writes a version for each.</p>
              {accounts === null ? (
                <div className="mt-6 flex items-center gap-2 text-sm text-muted-ink"><Spinner className="size-4" /> Loading your channels…</div>
              ) : channels.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-hairline bg-card p-6 text-center">
                  <p className="font-medium">No channels connected yet</p>
                  <p className="mt-1 text-sm text-muted-ink">Connect a social account to start posting.</p>
                  <Link href="/integrations" className={cn(primary, "mt-4")}>Connect a channel</Link>
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {channels.map(({ key, account, active, stale, name, Icon, color }) => {
                    const on = chosen.includes(key);
                    if (!active.length) {
                      return (
                        <div key={key} className="flex min-h-16 items-center gap-3 rounded-xl border border-dashed border-hairline bg-card px-4">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-hairline bg-background opacity-60"><Icon aria-hidden className={cn("text-lg", color)} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">{name}</span>
                            <span className="block truncate text-xs text-warning">{stale.length > 1 ? `${stale.length} accounts need` : "Needs"} reconnecting</span>
                          </span>
                          <Link href="/integrations" className="shrink-0 text-xs font-medium text-brand-ink hover:underline">Reconnect</Link>
                        </div>
                      );
                    }
                    return (
                      <div key={key} className={cn("rounded-xl border bg-card transition-colors", on ? "border-brand ring-1 ring-brand/30" : "border-hairline hover:border-brand/40")}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          onClick={() => setChosen((prev) => (on ? prev.filter((p) => p !== key) : [...prev, key]))}
                          className="flex min-h-16 w-full items-center gap-3 px-4 text-left cursor-pointer"
                        >
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-hairline bg-background"><Icon aria-hidden className={cn("text-lg", color)} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">{name}</span>
                            <span className="block truncate text-xs text-muted-ink">
                              {active.length > 1 ? `${active.length} accounts` : account.account_name}
                              {VIDEO_ONLY.includes(key) ? " · video only" : ""}
                              {stale.length ? ` · ${stale.length} need reconnecting` : ""}
                            </span>
                          </span>
                          <span aria-hidden className={cn("grid size-5 shrink-0 place-items-center rounded-md border", on ? "border-brand bg-brand text-white" : "border-hairline")}>{on && <Check className="size-3.5" />}</span>
                        </button>
                        {on && active.length > 1 && (
                          <label className="flex items-center gap-2 border-t border-hairline px-4 py-2.5">
                            <span className="shrink-0 text-xs text-muted-ink">Post as</span>
                            <select value={String(account.id)} onChange={(e) => setPick((prev) => ({ ...prev, [key]: e.target.value }))} className={cn(field, "min-w-0 py-1.5")}>
                              {active.map((a) => <option key={a.id} value={String(a.id)}>{a.account_name}</option>)}
                            </select>
                          </label>
                        )}
                      </div>
                    );
                  })}
                  <Link href="/integrations" className="flex min-h-16 items-center justify-center gap-2 rounded-xl border border-dashed border-hairline text-sm font-medium text-muted-ink hover:border-brand/50 hover:text-brand-ink">
                    + Connect another
                  </Link>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="mx-auto grid max-w-5xl gap-5 p-4 sm:p-6 lg:grid-cols-[1fr_300px]">
              <div className="min-w-0">
                <h2 className="!text-xl !tracking-tight">Add your creative</h2>
                <p className="mt-1 text-sm text-muted-ink">Describe the post and the AI designs a picture, or upload your own.</p>
                <div role="tablist" aria-label="Creative" className="mt-4 grid grid-cols-2 gap-1 rounded-lg border border-hairline bg-card p-1 sm:w-80">
                  {[["ai", "Create with AI", Sparkles], ["upload", "Upload", Upload]].map(([key, label, Icon]) => (
                    <button key={key} type="button" role="tab" aria-selected={mode === key} onClick={() => setMode(key)} className={cn("inline-flex min-h-9 items-center justify-center gap-2 rounded-md text-sm cursor-pointer", mode === key ? "bg-tint font-medium text-foreground" : "text-muted-ink hover:text-foreground")}>
                      <Icon aria-hidden className="size-4" /> {label}
                    </button>
                  ))}
                </div>

                {mode === "ai" ? (
                  <div className="mt-4 flex h-[min(560px,62dvh)] flex-col overflow-hidden rounded-xl border border-hairline bg-card">
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
                      {messages.length === 0 && (
                        <div className="grid h-full place-content-center justify-items-center gap-3 text-center">
                          <span className="grid size-11 place-items-center rounded-2xl bg-tint text-brand-ink"><Wand2 aria-hidden className="size-5" /></span>
                          <div>
                            <p className="font-medium">What is this post about?</p>
                            <p className="mt-1 max-w-sm text-sm text-muted-ink">Say it like you would to a designer. Ask for changes until it looks right.</p>
                          </div>
                          <div className="flex max-w-md flex-wrap justify-center gap-1.5">
                            {STARTERS.map((s) => (
                              <button key={s} type="button" onClick={() => setDraft(s)} className="rounded-full border border-hairline px-3 py-1.5 text-xs text-muted-ink hover:border-brand/40 hover:text-foreground cursor-pointer">{s}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      {messages.map((m, i) => (
                        <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[85%] space-y-2", m.role === "user" && "text-right")}>
                            <p className={cn("inline-block whitespace-pre-line rounded-2xl px-3.5 py-2 text-left text-sm", m.role === "user" ? "rounded-br-md bg-brand text-white" : m.failed ? "rounded-bl-md border border-destructive/30 bg-destructive/10 text-destructive" : "rounded-bl-md bg-tint text-foreground")}>
                              {m.text}
                            </p>
                            {m.imageUrl && (
                              <div className={cn("overflow-hidden rounded-xl border-2 bg-background", media.url === m.imageUrl ? "border-brand" : "border-hairline")}>
                                <img src={m.imageUrl} alt="Picture made by the AI" className="block max-h-80 w-full object-contain" />
                                <div className="flex items-center justify-between gap-2 px-3 py-2">
                                  <span className="text-xs text-muted-ink">{media.url === m.imageUrl ? "Using this picture" : "Earlier version"}</span>
                                  {media.url !== m.imageUrl && (
                                    <button type="button" onClick={() => setMedia({ url: m.imageUrl, source: "ai" })} className="text-xs font-medium text-brand-ink hover:underline cursor-pointer">Use this one</button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {thinking && (
                        <div className="flex items-center gap-2 text-sm text-muted-ink"><Spinner className="size-4" /> Designing… this can take up to a minute.</div>
                      )}
                      <div ref={chatEnd} />
                    </div>
                    <form
                      className="flex items-end gap-2 border-t border-hairline p-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        send();
                      }}
                    >
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            send();
                          }
                        }}
                        rows={1}
                        maxLength={2000}
                        aria-label="Message to the AI designer"
                        placeholder={messages.length ? "Ask for a change, e.g. warmer colours, show a family" : "e.g. 20% off all haircuts this weekend, bright and cheerful"}
                        className="max-h-36 min-h-10 flex-1 resize-none rounded-lg border border-hairline bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                      />
                      <button type="submit" disabled={!draft.trim() || thinking} aria-label="Send" className={cn(primary, "size-10 px-0")}>
                        {thinking ? <Spinner className="size-4" /> : <Send aria-hidden className="size-4" />}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        upload(e.dataTransfer.files?.[0]);
                      }}
                      disabled={uploading}
                      className={cn("flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card px-4 py-10 text-center transition-colors cursor-pointer disabled:cursor-wait", dragging ? "border-brand bg-tint" : "border-hairline hover:border-brand/50")}
                    >
                      <span className="grid size-11 place-items-center rounded-full bg-tint text-brand-ink">{uploading ? <Spinner className="size-5" /> : <ImagePlus aria-hidden className="size-5" />}</span>
                      <span className="text-sm font-medium">{uploading ? "Uploading…" : <>Drop a file here or <span className="text-brand-ink">browse</span></>}</span>
                      <span className="text-xs text-muted-ink">Images up to 10 MB, videos up to 50 MB</span>
                    </button>
                    <input ref={fileInput} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
                    <div className="relative">
                      <Link2 aria-hidden className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-ink" />
                      <input
                        type="url"
                        aria-label="Or paste a public link"
                        placeholder="Or paste a public link (https://…)"
                        defaultValue={media.source === "link" ? media.url : ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (/^https:\/\//i.test(v)) setMedia({ url: v, source: "link" });
                        }}
                        className={cn(field, "pl-9")}
                      />
                    </div>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium">What is this post about?</span>
                      <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3} maxLength={3000} placeholder="A few words help the AI write better captions, e.g. new menu launches Friday, book a table" className={field} />
                    </label>
                  </div>
                )}
              </div>

              {/* Chosen creative */}
              <aside className="space-y-3 lg:pt-[4.6rem]">
                <p className="text-sm font-medium">Your creative</p>
                {media.url ? (
                  <div className="overflow-hidden rounded-xl border border-hairline bg-card">
                    {isVideo(media.url) ? <video src={media.url} controls preload="metadata" className="block max-h-80 w-full bg-black" /> : <img src={media.url} alt="Chosen creative" className="block max-h-80 w-full object-contain" />}
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs text-muted-ink">{media.source === "ai" ? "Made with AI" : media.source === "upload" ? "Uploaded" : "From a link"}</span>
                      <button type="button" onClick={() => setMedia({ url: "", source: "" })} className="inline-flex items-center gap-1 text-xs text-muted-ink hover:text-destructive cursor-pointer"><X aria-hidden className="size-3.5" /> Remove</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid aspect-[4/5] place-items-center rounded-xl border border-dashed border-hairline bg-card p-4 text-center text-xs text-muted-ink">Nothing chosen yet</div>
                )}
                {chosen.some((p) => VIDEO_ONLY.includes(p)) && mode === "ai" && (
                  <p className="flex gap-2 rounded-lg bg-tint px-3 py-2 text-xs text-muted-ink"><CircleAlert aria-hidden className="size-4 shrink-0 text-warning" /> YouTube and TikTok need a video. The AI makes pictures, so upload a video for those.</p>
                )}
              </aside>
            </div>
          )}

          {step === 2 && (
            <div className="mx-auto grid max-w-6xl gap-5 p-4 sm:p-6 lg:grid-cols-[1fr_360px]">
              <div className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="!text-xl !tracking-tight">Captions and hashtags</h2>
                    <p className="mt-1 text-sm text-muted-ink">Written for each channel from your creative. Edit anything you like.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor="tone">Tone</label>
                    <select id="tone" value={tone} onChange={(e) => setTone(e.target.value)} className={cn(field, "w-auto py-1.5")}>
                      {TONES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    <button type="button" onClick={() => writeAll()} disabled={Boolean(writing)} className={secondary}>
                      {writing === "all" ? <Spinner className="size-4" /> : <RefreshCw aria-hidden className="size-4" />} Rewrite all
                    </button>
                  </div>
                </div>

                {chosen.map((p) => {
                  const { name, Icon, color, limit } = PLATFORMS[p];
                  const post = posts[p];
                  const busy = writing === "all" || writing === p;
                  const length = post ? fullText(post).length : 0;
                  return (
                    <section key={p} onFocus={() => setFocus(p)} onClick={() => setFocus(p)} className={cn("rounded-xl border bg-card p-4", focus === p ? "border-brand/50" : "border-hairline")}>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-sm font-medium"><Icon aria-hidden className={cn("text-base", color)} /> {name}</span>
                        <button type="button" onClick={() => writeAll(p)} disabled={Boolean(writing)} className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-ink hover:underline cursor-pointer disabled:opacity-50">
                          {busy ? <Spinner className="size-3.5" /> : <Sparkles aria-hidden className="size-3.5" />} Rewrite
                        </button>
                      </div>
                      {!post ? (
                        <div className="space-y-2" aria-busy="true">
                          <div className="h-3 w-3/4 animate-pulse rounded bg-tint" />
                          <div className="h-3 w-full animate-pulse rounded bg-tint" />
                          <div className="h-3 w-2/3 animate-pulse rounded bg-tint" />
                          <p className="pt-1 text-xs text-muted-ink">{busy ? "Writing…" : "Not written yet."}</p>
                        </div>
                      ) : (
                        <div className={cn("space-y-3", busy && "opacity-60")}>
                          {NEEDS_TITLE.includes(p) && (
                            <label className="block">
                              <span className="mb-1 block text-xs font-medium text-muted-ink">Title</span>
                              <input value={post.title} maxLength={100} onChange={(e) => setPost(p, { title: e.target.value })} className={field} />
                            </label>
                          )}
                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-muted-ink">Caption</span>
                            <textarea value={post.caption} onChange={(e) => setPost(p, { caption: e.target.value })} rows={p === "x_twitter" || p === "tiktok" ? 3 : 6} className={cn(field, "resize-y leading-relaxed")} />
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {post.hashtags.map((t) => (
                              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-tint px-2.5 py-1 text-xs text-brand-ink">
                                {t}
                                <button type="button" aria-label={`Remove ${t}`} onClick={() => setPost(p, { hashtags: post.hashtags.filter((x) => x !== t) })} className="opacity-60 hover:opacity-100 cursor-pointer"><X className="size-3" /></button>
                              </span>
                            ))}
                            <input
                              aria-label={`Add a hashtag for ${name}`}
                              placeholder="+ hashtag"
                              className="min-h-7 w-28 rounded-full border border-dashed border-hairline bg-transparent px-2.5 text-xs outline-none focus:border-brand"
                              onKeyDown={(e) => {
                                if (e.key !== "Enter" && e.key !== ",") return;
                                e.preventDefault();
                                const t = `#${e.currentTarget.value.replace(/[^\p{L}\p{N}_]/gu, "")}`;
                                if (t.length > 1 && !post.hashtags.includes(t)) setPost(p, { hashtags: [...post.hashtags, t] });
                                e.currentTarget.value = "";
                              }}
                            />
                          </div>
                          <p className={cn("text-right text-xs tabular-nums", length > limit ? "font-semibold text-destructive" : "text-muted-ink")}>{length.toLocaleString()} / {limit.toLocaleString()} with hashtags</p>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
              <aside className="lg:sticky lg:top-0 lg:self-start">{preview || <div className="grid aspect-[4/5] place-items-center rounded-xl border border-dashed border-hairline text-sm text-muted-ink">The preview appears here.</div>}</aside>
            </div>
          )}

          {step === 3 && (
            <div className="mx-auto grid max-w-6xl gap-5 p-4 sm:p-6 lg:grid-cols-[1fr_360px]">
              <div className="min-w-0 space-y-4">
                <div>
                  <h2 className="!text-xl !tracking-tight">Check and approve</h2>
                  <p className="mt-1 text-sm text-muted-ink">This is exactly what will be posted.</p>
                </div>
                <ul className="divide-y divide-hairline rounded-xl border border-hairline bg-card">
                  {chosen.map((p) => {
                    const { name, Icon, color } = PLATFORMS[p];
                    return (
                      <li key={p}>
                        <button type="button" onClick={() => setFocus(p)} className={cn("flex w-full items-start gap-3 p-4 text-left cursor-pointer", focus === p && "bg-tint/60")}>
                          <Icon aria-hidden className={cn("mt-0.5 shrink-0 text-base", color)} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2 text-sm font-medium">{name}<span className="truncate text-xs font-normal text-muted-ink">{channels.find((c) => c.key === p)?.account.account_name}</span></span>
                            {posts[p]?.title && <span className="mt-1 block text-sm font-medium">{posts[p].title}</span>}
                            <span className="mt-1 line-clamp-2 block text-sm text-muted-ink">{posts[p] ? fullText(posts[p]) : ""}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <section className="rounded-xl border border-hairline bg-card p-4">
                  <p className="text-sm font-medium">When should it go out?</p>
                  <div role="radiogroup" aria-label="When" className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-hairline bg-background p-1 sm:w-80">
                    {[[true, "Schedule"], [false, "Post now"]].map(([later, label]) => (
                      <button key={label} type="button" role="radio" aria-checked={when.later === later} onClick={() => setWhen((w) => ({ ...w, later }))} className={cn("min-h-9 rounded-md text-sm cursor-pointer", when.later === later ? "bg-card font-medium shadow-sm" : "text-muted-ink hover:text-foreground")}>{label}</button>
                    ))}
                  </div>
                  {when.later && (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:w-80">
                      <label className="block"><span className="mb-1 block text-xs font-medium text-muted-ink">Date</span><input type="date" value={when.day} onChange={(e) => setWhen((w) => ({ ...w, day: e.target.value }))} className={field} /></label>
                      <label className="block"><span className="mb-1 block text-xs font-medium text-muted-ink">Time</span><input type="time" value={when.time} onChange={(e) => setWhen((w) => ({ ...w, time: e.target.value }))} className={field} /></label>
                    </div>
                  )}
                </section>

                {problems.length > 0 && (
                  <ul className="space-y-1.5 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
                    {problems.map((p) => <li key={p} className="flex gap-2"><CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" /> {p}</li>)}
                  </ul>
                )}
              </div>
              <aside className="lg:sticky lg:top-0 lg:self-start">{preview}</aside>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-hairline bg-card px-4 py-3 sm:px-5">
          {error && (
            <p role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" /> {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {step > 0 ? (
                <button type="button" onClick={() => go(step - 1)} className={secondary}><ArrowLeft aria-hidden className="size-4" /> Back</button>
              ) : (
                <Link href="/app" className="text-sm font-medium text-muted-ink hover:text-foreground">Cancel</Link>
              )}
              {!canNext && nextHint && <span className="hidden text-xs text-muted-ink sm:inline">{nextHint}</span>}
            </div>
            {step < 3 ? (
              <button type="button" disabled={!canNext} onClick={() => go(step + 1)} className={primary}>
                {step === 1 ? "Write captions" : "Continue"} <ArrowRight aria-hidden className="size-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button type="button" disabled={Boolean(saving)} onClick={() => save("draft")} className={secondary}>{saving === "draft" && <Spinner className="size-4" />} Save draft</button>
                <button type="button" disabled={Boolean(saving) || problems.length > 0} onClick={() => save(when.later ? "schedule" : "now")} className={primary}>
                  {saving && saving !== "draft" ? <Spinner className="size-4" /> : <Check aria-hidden className="size-4" />}
                  {when.later ? "Approve and schedule" : "Approve and post now"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
