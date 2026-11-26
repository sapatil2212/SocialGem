"use client";

import { inWorkspace } from "@/lib/workspace-client";
import { useState } from "react";
import { FaMagic, FaCheck, FaSync } from "react-icons/fa";
import { FiX, FiAlertCircle } from "react-icons/fi";

const NAMES = {"youtube":"YouTube","tiktok":"TikTok","instagram":"Instagram","facebook":"Facebook","x_twitter":"X","linkedin":"LinkedIn","threads":"Threads","pinterest":"Pinterest"};

const TONES = [
  "Engaging",
  "Professional",
  "Casual",
  "Excited",
  "Educational",
  "Viral",
  "Storytelling"
];

export default function AiPostWriter({
  platform = "youtube",
  onApply,
  onClose,
}) {
  const [prompt, setPrompt] = useState("");
  const [selectedTone, setSelectedTone] = useState("Engaging");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedResult, setGeneratedResult] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Say what the post is about first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(inWorkspace("/ai/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          platform,
          tone: selectedTone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate post with AI.");
      }

      setGeneratedResult(data.data);
    } catch (err) {
      setError(err.message || "Failed to connect to AI generation service.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrefill = () => {
    if (!generatedResult) return;
    onApply(generatedResult);
  };

  const button = "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-60";
  return (
    <section aria-label="Write with AI" className="rounded-xl border border-brand/30 bg-tint/60 p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-white"><FaMagic className="text-xs" /></span>
          <div>
            <h3 className="!text-sm !leading-5 !tracking-normal font-semibold">Write with AI</h3>
            <p className="text-xs text-muted-ink">A draft for {NAMES[platform] || platform}. You can edit it before posting.</p>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close AI writer" className="grid size-8 place-items-center rounded-lg text-muted-ink hover:bg-card hover:text-foreground cursor-pointer">
            <FiX />
          </button>
        )}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted-ink">What is the post about?</span>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="For example: announce our weekend offer, 20% off all services, book by Sunday"
          className="block w-full resize-y rounded-lg border border-hairline bg-card px-3 py-2.5 text-sm leading-relaxed outline-none transition placeholder:text-muted-ink/70 focus:border-brand focus:ring-2 focus:ring-brand/15"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
          }}
        />
      </label>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-muted-ink">Tone</span>
        <div role="radiogroup" aria-label="Tone" className="flex flex-wrap gap-1.5">
          {TONES.map((tone) => (
            <button
              key={tone}
              type="button"
              role="radio"
              aria-checked={selectedTone === tone}
              onClick={() => setSelectedTone(tone)}
              className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs transition-colors cursor-pointer ${
                selectedTone === tone ? "border-brand bg-brand font-medium text-white" : "border-hairline bg-card text-muted-ink hover:border-brand/40 hover:text-foreground"
              }`}
            >
              {tone}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <FiAlertCircle aria-hidden className="mt-0.5 shrink-0" /> {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="hidden text-xs text-muted-ink sm:inline">
          <kbd className="rounded border border-hairline bg-card px-1 font-sans">Ctrl</kbd> + <kbd className="rounded border border-hairline bg-card px-1 font-sans">Enter</kbd> to write
        </span>
        <button type="button" disabled={loading} onClick={handleGenerate} className={`${button} ml-auto bg-brand text-white hover:bg-brand-hover`}>
          {loading ? <span aria-hidden className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin motion-reduce:animate-none" /> : <FaMagic aria-hidden className="text-xs" />}
          {loading ? "Writing…" : generatedResult ? "Write again" : "Write draft"}
        </button>
      </div>

      {generatedResult && (
        <div className="rounded-lg border border-hairline bg-card p-3.5 space-y-3" aria-live="polite">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-brand-ink">Suggested draft</span>
            <button type="button" onClick={handleGenerate} disabled={loading} className="inline-flex items-center gap-1 text-xs text-muted-ink hover:text-foreground cursor-pointer">
              <FaSync aria-hidden className={`text-[10px] ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} /> Try another
            </button>
          </div>
          {generatedResult.title && <p className="text-sm font-semibold">{generatedResult.title}</p>}
          <p className="max-h-44 overflow-y-auto whitespace-pre-line pr-1 text-sm leading-relaxed">{generatedResult.description}</p>
          {generatedResult.tags && <p className="text-xs text-brand-ink">{generatedResult.tags}</p>}
          <div className="flex justify-end">
            <button type="button" onClick={handlePrefill} className={`${button} bg-brand text-white hover:bg-brand-hover`}>
              <FaCheck aria-hidden className="text-xs" /> Use this draft
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
