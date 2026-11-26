"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Check, CircleAlert, CircleCheck, ExternalLink, ImagePlus, LoaderCircle, PenLine, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input, NativeSelect } from "@/components/ui/field";
import { inWorkspace } from "@/lib/workspace-client";
import { cn } from "@/lib/utils";

type Brand = {
  name: string; oneLiner: string; audience: string; positioning: string; voice: { traits: string[]; dos: string[]; donts: string[] };
  pillars: { name: string; description: string }[]; colors: { name: string; hex: string; use: string }[]; fonts: { heading: string; body: string };
  imageStyle: string; logoNotes: string; hashtags: string[]; avoid: string[]; facts: string[]; assumptions: string[];
};
type Research = { competitors: { name: string; url: string; platforms: string[]; summary: string; strengths: string; gap: string }[]; trends: { platform: string; topic: string; format: string; why: string; sourceUrl: string }[]; opportunities: string[] };
type Job = { id: string; kind: string; status: "RUNNING" | "DONE" | "FAILED"; step: string; error: string | null };
type State = {
  ready: { claude: boolean; gemini: boolean }; platforms: string[]; today: string; tomorrow: string; timezone: string; brand: { data: Brand; website: string | null; sources: string[]; approvedAt: string | null } | null;
  research: { data: Research; region: string; createdAt: string } | null; plans: { id: string; title: string; startDay: string; days: number; posts: number }[]; job: Job | null; budget: { spent: number; limit: number }; imageUsd: number;
};
type Idea = { id: string; scheduledAt: string; platforms: string[]; format: string; pillar: string; topic: string; angle: string; captions: Record<string, string>; hashtags: string | null; imagePrompt: string | null; imageUrl: string | null; status: "IDEA" | "READY" | "SCHEDULED"; error: string | null };
type Plan = { id: string; title: string; strategy: string; startDay: string; days: number; platforms: string[]; ideas: Idea[] };

const NAMES: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", x_twitter: "X", youtube: "YouTube", tiktok: "TikTok", linkedin: "LinkedIn", threads: "Threads", pinterest: "Pinterest" };
const TABS = ["Brand", "Research", "Plan and posts"] as const;
const OFFLINE = "We could not reach the server. Please try again.";

async function api<T>(method: string, path: string, body?: object): Promise<{ data?: T; error: string }> {
  try {
    const response = await fetch(inWorkspace(`/studio${path}`), { method, ...(body && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
    const data = await response.json();
    return response.ok ? { data, error: "" } : { error: data.error || OFFLINE };
  } catch {
    return { error: OFFLINE };
  }
}

const card = "rounded-xl border border-hairline bg-card p-4 sm:p-5";
const area = "w-full rounded-lg border border-foreground/20 bg-card px-3 py-2 text-sm leading-relaxed text-foreground";
const usd = (n: number) => `$${n < 0.1 ? n.toFixed(3) : n.toFixed(2)}`;

function Area(props: React.ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(area, props.className)} />;
}

function Section({ title, text, children, action }: { title: string; text?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className={card}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="!text-base">{title}</h2>{text && <p className="mt-1 text-sm text-muted-ink">{text}</p>}</div>{action}</div>
      {children}
    </section>
  );
}

export default function AiStudio() {
  const [state, setState] = useState<State | null>(null);
  const [tab, setTab] = useState(0);
  const [problem, setProblem] = useState("");
  const [planId, setPlanId] = useState("");
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    const { data, error } = await api<State>("GET", "");
    if (data) setState(data);
    else setProblem(error);
    return data;
  }, []);

  useEffect(() => {
    let live = true;
    void (async () => {
      const { data, error } = await api<State>("GET", "");
      if (!live) return;
      if (data) setState(data);
      else setProblem(error);
    })();
    return () => {
      live = false;
    };
  }, []);

  const running = state?.job?.status === "RUNNING";
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(async () => {
      const next = await load();
      if (next?.job && next.job.status !== "RUNNING") setVersion((v) => v + 1);
    }, 3000);
    return () => clearInterval(timer);
  }, [running, load]);

  const start = async (body: object) => {
    setProblem("");
    const { error } = await api("POST", "/jobs", body);
    if (error) setProblem(error);
    await load();
    return !error;
  };

  if (!state) return <div className="p-6">{problem ? <FormAlert>{problem}</FormAlert> : <p role="status" className="flex items-center gap-2 text-muted-ink"><LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" /> Loading AI studio</p>}</div>;

  const props = { state, start, reload: load, busy: running, setProblem };
  const used = Math.min(100, (state.budget.spent / Math.max(0.01, state.budget.limit)) * 100);
  return (
    <div className="mx-auto grid max-w-6xl gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="AI studio" className="flex gap-1 rounded-xl border border-hairline bg-card p-1">
          {TABS.map((name, i) => (
            <button key={name} id={`studio-tab-${i}`} role="tab" aria-selected={tab === i} aria-controls="studio-panel" type="button" onClick={() => setTab(i)} className={cn("flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm", tab === i ? "gradient-brand font-medium" : "text-muted-ink hover:text-foreground")}>
              {name}{((i === 0 && state.brand?.approvedAt) || (i === 1 && state.research) || (i === 2 && state.plans.length > 0)) && <Check aria-label="done" className="size-3.5" />}
            </button>
          ))}
        </div>
        <div className="w-full text-xs text-muted-ink sm:w-52">
          <div className="flex justify-between"><span>AI budget this month</span><span className="tabular-nums">{usd(state.budget.spent)} of ${state.budget.limit}</span></div>
          <div aria-hidden className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-tint-strong"><div className={cn("h-full", used > 90 ? "bg-destructive" : "bg-brand")} style={{ width: `${used}%` }} /></div>
        </div>
      </div>

      {(!state.ready.claude || !state.ready.gemini) && (
        <p className="flex gap-2.5 rounded-lg border border-warning/30 bg-cream p-3 text-sm text-warning dark:bg-amber-400/10"><CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {!state.ready.claude && !state.ready.gemini ? "Claude and Gemini are not set up on this server yet." : !state.ready.claude ? "Claude is not set up on this server yet." : "Gemini is not set up yet, so images are off."}
        </p>
      )}
      {problem && <FormAlert>{problem}</FormAlert>}
      {state.job && <JobBar job={state.job} />}

      <div id="studio-panel" role="tabpanel" aria-labelledby={`studio-tab-${tab}`} className="grid gap-4">
        {tab === 0 && <BrandTab key={`${version}-${state.brand?.approvedAt ?? ""}`} {...props} />}
        {tab === 1 && <ResearchTab {...props} />}
        {tab === 2 && (planId ? <PlanView key={planId} id={planId} version={version} onBack={() => { setPlanId(""); void load(); }} {...props} /> : <PlanTab onOpen={setPlanId} {...props} />)}
      </div>
    </div>
  );
}

function JobBar({ job }: { job: Job }) {
  if (job.status === "RUNNING") return <p role="status" className="flex items-center gap-2.5 rounded-lg border border-brand/30 bg-tint p-3 text-sm"><LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin text-brand-ink motion-reduce:animate-none" />{job.step}. You can leave this page; it keeps going.</p>;
  if (job.status === "FAILED") return <FormAlert>{job.error ?? "The last task did not finish."}</FormAlert>;
  return <p role="status" className="flex items-center gap-2.5 rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success"><CircleCheck aria-hidden className="size-4 shrink-0" />{job.step}</p>;
}

type TabProps = { state: State; start: (body: object) => Promise<boolean>; reload: () => Promise<State | undefined>; busy: boolean; setProblem: (m: string) => void };

const lines = (v: string[]) => v.join("\n");
const unlines = (v: FormDataEntryValue | null) => String(v ?? "").split("\n").map((x) => x.trim()).filter(Boolean);

function BrandTab({ state, start, reload, busy, setProblem }: TabProps) {
  const [remake, setRemake] = useState(!state.brand);
  const [saving, setSaving] = useState(false);
  const b = state.brand?.data;

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!b) return;
    const f = new FormData(event.currentTarget);
    const text = (n: string) => String(f.get(n) ?? "").trim();
    setSaving(true);
    setProblem("");
    const { error } = await api("PUT", "", {
      ...b, name: text("name"), oneLiner: text("oneLiner"), audience: text("audience"), positioning: text("positioning"), imageStyle: text("imageStyle"), logoNotes: text("logoNotes"),
      voice: { traits: unlines(f.get("traits")), dos: unlines(f.get("dos")), donts: unlines(f.get("donts")) },
      pillars: b.pillars.map((p, i) => ({ name: text(`pillar-${i}`), description: text(`pillar-text-${i}`) })).filter((p) => p.name),
      colors: b.colors.map((c, i) => ({ ...c, hex: text(`color-${i}`) })), fonts: { heading: text("heading"), body: text("body") },
      hashtags: unlines(f.get("hashtags")), avoid: unlines(f.get("avoid")), facts: unlines(f.get("facts")), assumptions: unlines(f.get("assumptions")),
    });
    setSaving(false);
    if (error) setProblem(error);
    await reload();
  };

  return (
    <>
      {remake && (
        <Section title={b ? "Rebuild from your website" : "Start with your business"} text="We read your public website and turn it into brand guidelines for you to review.">
          <form className="grid gap-4" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); if (b && !confirm("Replace your current guidelines? Your edits will be lost.")) return; if (await start({ kind: "brand", website: f.get("website"), about: f.get("about") })) setRemake(false); }}>
            <Field label="Website" hint="Leave empty if you do not have one."><Input name="website" inputMode="url" placeholder="yourbusiness.com" defaultValue={state.brand?.website ?? ""} /></Field>
            <Field label="About the business" hint="What you sell, who for, and anything the AI must get right."><Area name="about" rows={4} maxLength={3000} /></Field>
            <div className="flex gap-2"><Button type="submit" disabled={busy || !state.ready.claude}><Sparkles /> Create brand guidelines</Button>{b && <Button type="button" variant="ghost" onClick={() => setRemake(false)}>Cancel</Button>}</div>
          </form>
        </Section>
      )}
      {b && (
        <form onSubmit={save} className="grid gap-4">
          <Section title="Brand guidelines" text={state.brand?.approvedAt ? "Approved. Everything the AI writes follows this." : "Check this and approve it. Nothing else runs until you do."} action={!remake && <Button type="button" variant="outline" disabled={busy} onClick={() => setRemake(true)}>Rebuild</Button>}>
            {b.assumptions.length > 0 && !state.brand?.approvedAt && <div className="mb-4 rounded-lg bg-cream p-3 text-sm text-warning dark:bg-amber-400/10"><b>Please check these guesses:</b><ul className="mt-1 list-disc pl-5">{b.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></div>}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name"><Input name="name" defaultValue={b.name} maxLength={80} /></Field>
              <Field label="In one line"><Input name="oneLiner" defaultValue={b.oneLiner} maxLength={200} /></Field>
              <Field label="Audience"><Area name="audience" rows={3} defaultValue={b.audience} maxLength={600} /></Field>
              <Field label="Positioning"><Area name="positioning" rows={3} defaultValue={b.positioning} maxLength={600} /></Field>
            </div>
          </Section>
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Voice" text="One per line."><div className="grid gap-4"><Field label="Traits"><Area name="traits" rows={3} defaultValue={lines(b.voice.traits)} /></Field><Field label="Do"><Area name="dos" rows={4} defaultValue={lines(b.voice.dos)} /></Field><Field label="Do not"><Area name="donts" rows={4} defaultValue={lines(b.voice.donts)} /></Field></div></Section>
            <Section title="Look"><div className="grid gap-4">
              <div className="flex flex-wrap gap-3">{b.colors.map((c, i) => <label key={i} className="grid gap-1 text-xs text-muted-ink"><input type="color" name={`color-${i}`} defaultValue={c.hex} className="h-11 w-16 cursor-pointer rounded-lg border border-hairline bg-card p-1" />{c.name}</label>)}</div>
              <div className="grid grid-cols-2 gap-3"><Field label="Heading font"><Input name="heading" defaultValue={b.fonts.heading} maxLength={60} /></Field><Field label="Body font"><Input name="body" defaultValue={b.fonts.body} maxLength={60} /></Field></div>
              <Field label="Image style"><Area name="imageStyle" rows={3} defaultValue={b.imageStyle} maxLength={600} /></Field>
              <Field label="Logo notes"><Area name="logoNotes" rows={2} defaultValue={b.logoNotes} maxLength={400} /></Field>
            </div></Section>
            <Section title="Content pillars"><div className="grid gap-3">{b.pillars.map((p, i) => <div key={i} className="grid gap-2"><Input name={`pillar-${i}`} aria-label={`Pillar ${i + 1}`} defaultValue={p.name} maxLength={60} /><Area name={`pillar-text-${i}`} aria-label={`Pillar ${i + 1} description`} rows={2} defaultValue={p.description} maxLength={300} /></div>)}</div></Section>
            <Section title="Facts and limits" text="One per line."><div className="grid gap-4"><Field label="Facts the AI may use"><Area name="facts" rows={4} defaultValue={lines(b.facts)} /></Field><Field label="Never mention"><Area name="avoid" rows={3} defaultValue={lines(b.avoid)} /></Field><Field label="Hashtags"><Area name="hashtags" rows={3} defaultValue={lines(b.hashtags)} /></Field><Field label="Still to confirm"><Area name="assumptions" rows={2} defaultValue={lines(b.assumptions)} /></Field></div></Section>
          </div>
          <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={saving || busy}>{saving ? "Saving" : state.brand?.approvedAt ? "Save changes" : "Approve guidelines"}</Button>{(state.brand?.sources.length ?? 0) > 0 && <span className="text-xs text-muted-ink">Read from {state.brand!.sources.length} {state.brand!.sources.length === 1 ? "page" : "pages"}</span>}</div>
        </form>
      )}
    </>
  );
}

function ResearchTab({ state, start, busy }: TabProps) {
  const r = state.research?.data;
  return (
    <>
      <Section title="Competitors and trends" text="Searches public web pages. It cannot see inside social apps, so treat this as a guide.">
        <form className="grid items-end gap-4 md:grid-cols-[1fr_200px_auto]" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void start({ kind: "research", competitors: f.get("competitors"), region: f.get("region") }); }}>
          <Field label="Competitors you know"><Input name="competitors" maxLength={500} placeholder="Optional, separated by commas" /></Field>
          <Field label="Region"><Input name="region" maxLength={80} defaultValue={state.research?.region ?? "India"} /></Field>
          <Button type="submit" disabled={busy || !state.ready.claude || !state.brand?.approvedAt}><Search /> {r ? "Search again" : "Start research"}</Button>
        </form>
        {!state.brand?.approvedAt && <p className="mt-3 text-sm text-muted-ink">Approve your brand guidelines first.</p>}
      </Section>
      {r && (
        <>
          <Section title="What is working now" text={`Found ${new Date(state.research!.createdAt).toLocaleDateString()}`}>
            <ul className="grid gap-3 md:grid-cols-2">{r.trends.map((t) => <li key={t.sourceUrl + t.topic} className="rounded-lg border border-hairline p-3 text-sm"><span className="text-xs text-brand-ink">{t.platform}, {t.format}</span><b className="mt-0.5 block font-semibold">{t.topic}</b><p className="mt-1 text-muted-ink">{t.why}</p><Source url={t.sourceUrl} /></li>)}</ul>
            {!r.trends.length && <p className="text-sm text-muted-ink">No trends with a checkable source were found.</p>}
          </Section>
          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <Section title="Competitors"><ul className="grid gap-3">{r.competitors.map((c) => <li key={c.url + c.name} className="rounded-lg border border-hairline p-3 text-sm"><b className="font-semibold">{c.name}</b><p className="mt-1 text-muted-ink">{c.summary}</p><p className="mt-1.5"><b className="font-medium">Doing well:</b> {c.strengths}</p><p className="mt-1"><b className="font-medium">Your opening:</b> {c.gap}</p><Source url={c.url} /></li>)}</ul></Section>
            <Section title="Opportunities"><ul className="grid list-disc gap-2 pl-5 text-sm">{r.opportunities.map((o) => <li key={o}>{o}</li>)}</ul></Section>
          </div>
        </>
      )}
    </>
  );
}

function Source({ url }: { url: string }) {
  return <a href={url} target="_blank" rel="noreferrer nofollow" className="mt-2 inline-flex max-w-full items-center gap-1 text-xs font-medium text-brand-ink"><ExternalLink aria-hidden className="size-3 shrink-0" /><span className="truncate">{url.replace(/^https?:\/\/(www\.)?/, "")}</span></a>;
}

function PlanTab({ state, start, busy, onOpen }: TabProps & { onOpen: (id: string) => void }) {
  const [picked, setPicked] = useState<string[]>(state.platforms);
  return (
    <>
      <Section title="New content plan" text="Uses your brand guidelines and latest research. Nothing is written or scheduled yet.">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void start({ kind: "plan", goal: f.get("goal"), start: f.get("start"), days: Number(f.get("days")), perWeek: Number(f.get("perWeek")), platforms: picked }); }}>
          <Field label="Goal" hint="For example: more bookings for Diwali."><Input name="goal" maxLength={500} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Starts"><Input type="date" name="start" defaultValue={state.tomorrow} min={state.today} required /></Field>
            <Field label="Length"><NativeSelect name="days" defaultValue="7"><option value="7">1 week</option><option value="14">2 weeks</option><option value="30">30 days</option></NativeSelect></Field>
            <Field label="Posts a week"><NativeSelect name="perWeek" defaultValue="4">{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n}>{n}</option>)}</NativeSelect></Field>
          </div>
          <fieldset className="flex flex-wrap gap-2"><legend className="mb-1.5 text-sm font-medium">Platforms</legend>{state.platforms.map((p) => <label key={p} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-hairline px-3 text-sm"><input type="checkbox" className="accent-[#6d28d9]" checked={picked.includes(p)} onChange={(e) => setPicked((all) => (e.target.checked ? [...all, p] : all.filter((x) => x !== p)))} />{NAMES[p] ?? p}</label>)}</fieldset>
          <Button type="submit" className="w-fit" disabled={busy || !state.ready.claude || !state.brand?.approvedAt || !picked.length}><Sparkles /> Make the plan</Button>
          {!state.brand?.approvedAt && <p className="text-sm text-muted-ink">Approve your brand guidelines first.</p>}
        </form>
      </Section>
      {state.plans.length > 0 && <Section title="Your plans"><ul className="grid gap-1">{state.plans.map((p) => <li key={p.id}><button type="button" onClick={() => onOpen(p.id)} className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-tint"><b className="min-w-0 flex-1 truncate font-medium">{p.title}</b><span className="shrink-0 text-muted-ink">{p.posts} posts from {p.startDay}</span></button></li>)}</ul></Section>}
    </>
  );
}

function PlanView({ id, version, state, start, busy, setProblem, onBack }: TabProps & { id: string; version: number; onBack: () => void }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [done, setDone] = useState("");
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await api<Plan>("GET", `/plans/${id}`);
    if (data) setPlan(data);
    else setProblem(error);
  }, [id, setProblem]);
  useEffect(() => {
    let live = true;
    void (async () => {
      const { data, error } = await api<Plan>("GET", `/plans/${id}`);
      if (!live) return;
      if (data) setPlan(data);
      else setProblem(error);
    })();
    return () => {
      live = false;
    };
  }, [id, version, setProblem]);

  if (!plan) return <p role="status" className="text-sm text-muted-ink">Loading the plan</p>;
  const open = plan.ideas.filter((i) => i.status !== "SCHEDULED");
  const chosen = open.filter((i) => picked.includes(i.id));
  const ready = chosen.filter((i) => i.status === "READY");
  const imageable = ready.filter((i) => i.format === "image");
  const allOn = open.length > 0 && chosen.length === open.length;

  const schedule = async () => {
    if (!confirm(`Approve and schedule ${chosen.length} ${chosen.length === 1 ? "post" : "posts"}?`)) return;
    setWorking(true);
    setProblem("");
    setDone("");
    const { data, error } = await api<{ scheduled: number; problems: { topic: string; reason: string }[] }>("POST", `/plans/${id}/schedule`, { ideaIds: chosen.map((i) => i.id) });
    setWorking(false);
    if (error) setProblem(error);
    if (data) setDone(`${data.scheduled} scheduled.${data.problems.length ? ` ${data.problems.length} need attention, shown below.` : ""}`);
    setPicked([]);
    await load();
  };

  return (
    <>
      <Section title={plan.title} text={plan.strategy} action={<Button variant="outline" onClick={onBack}>All plans</Button>}>
        <p className="flex gap-2 rounded-lg bg-cream p-3 text-sm text-warning dark:bg-amber-400/10"><CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />Automatic publishing is not switched on yet. Scheduled posts appear in your calendar but will not go out.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="mr-2 flex min-h-9 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[#6d28d9]" checked={allOn} disabled={!open.length} onChange={() => setPicked(allOn ? [] : open.map((i) => i.id))} />{chosen.length ? `${chosen.length} chosen` : "Choose all"}</label>
          <Button variant="outline" disabled={busy || !chosen.length || !state.ready.claude} onClick={() => start({ kind: "write", planId: id, ideaIds: chosen.map((i) => i.id) })}><PenLine /> Write posts</Button>
          <Button variant="outline" disabled={busy || !imageable.length || imageable.length > 20 || !state.ready.gemini} onClick={() => confirm(`Make ${imageable.length} ${imageable.length === 1 ? "image" : "images"} for about ${usd(imageable.length * state.imageUsd)}?`) && start({ kind: "images", planId: id, ideaIds: imageable.map((i) => i.id) })}><ImagePlus /> Make images{imageable.length ? `, about ${usd(imageable.length * state.imageUsd)}` : ""}</Button>
          <Button disabled={busy || working || !chosen.length} onClick={schedule}><Check /> Approve and schedule</Button>
        </div>
        {done && <p role="status" className="mt-3 text-sm font-medium text-success">{done} <Link href="/app" className="underline">Open calendar</Link></p>}
      </Section>
      <ul className="grid gap-3">
        {plan.ideas.map((idea) => <IdeaCard key={`${idea.id}-${idea.status}-${idea.imageUrl ?? ""}-${version}`} planId={id} idea={idea} on={picked.includes(idea.id)} onPick={(v) => setPicked((all) => (v ? [...all, idea.id] : all.filter((x) => x !== idea.id)))} reload={load} busy={busy} zone={state.timezone} setProblem={setProblem} />)}
      </ul>
    </>
  );
}

function IdeaCard({ planId, idea, on, onPick, reload, busy, zone, setProblem }: { planId: string; idea: Idea; on: boolean; onPick: (v: boolean) => void; reload: () => Promise<void>; busy: boolean; zone: string; setProblem: (m: string) => void }) {
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const locked = idea.status === "SCHEDULED";
  const path = `/plans/${planId}/ideas/${idea.id}`;
  const write = Object.keys(idea.captions).length > 0;

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setSaving(true);
    setProblem("");
    const when = String(f.get("when") ?? "");
    const { error } = await api("PATCH", path, {
      ...(when && { scheduledAt: new Date(when).toISOString() }), hashtags: String(f.get("hashtags") ?? ""), imagePrompt: String(f.get("imagePrompt") ?? ""),
      captions: Object.fromEntries(idea.platforms.map((p) => [p, String(f.get(p) ?? "")])), ...(f.get("removeImage") && { removeImage: true }),
    });
    setSaving(false);
    if (error) return setProblem(error);
    setEdit(false);
    await reload();
  };
  const date = new Date(idea.scheduledAt);
  const localValue = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

  return (
    <li className={cn("grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-[auto_1fr_auto]", on ? "border-brand" : "border-hairline")}>
      <input type="checkbox" aria-label={`Choose ${idea.topic}`} className="mt-1 size-4 accent-[#6d28d9]" checked={on} disabled={locked} onChange={(e) => onPick(e.target.checked)} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-ink">
          <time dateTime={idea.scheduledAt} className="font-medium text-foreground">{date.toLocaleString(undefined, { timeZone: zone, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</time>
          <span>{idea.platforms.map((p) => NAMES[p] ?? p).join(", ")}</span><span>{idea.pillar}</span>
          <span className={cn("rounded-md px-1.5 py-0.5 font-medium", locked ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300" : idea.status === "READY" ? "bg-tint-strong text-brand-ink" : "bg-cream text-warning dark:bg-amber-400/10")}>{locked ? "Scheduled" : idea.status === "READY" ? "Ready to review" : "Idea"}</span>
        </div>
        <h3 className="mt-1.5 !text-[0.97rem] !leading-snug !tracking-normal">{idea.topic}</h3>
        {!edit && <p className="mt-1 text-sm text-muted-ink">{idea.angle}</p>}
        {idea.error && <p className="mt-2 text-sm font-medium text-destructive">{idea.error}</p>}
        {!edit && write && <div className="mt-3 grid gap-3">{idea.platforms.map((p) => <div key={p} className="rounded-lg bg-tint p-3 text-sm"><b className="text-xs font-medium text-brand-ink">{NAMES[p] ?? p}</b><p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{idea.captions[p]}</p></div>)}{idea.hashtags && <p className="text-sm text-brand-ink">{idea.hashtags.split(",").map((t) => `#${t.trim()}`).join(" ")}</p>}</div>}
        {edit && (
          <form onSubmit={save} className="mt-3 grid gap-3">
            <Field label="When" hint="In your device's time zone."><Input type="datetime-local" name="when" defaultValue={localValue} /></Field>
            {idea.platforms.map((p) => <Field key={p} label={`${NAMES[p] ?? p} caption`}><Area name={p} rows={5} defaultValue={idea.captions[p] ?? ""} /></Field>)}
            <Field label="Hashtags" hint="Separated by commas."><Input name="hashtags" defaultValue={idea.hashtags ?? ""} maxLength={1000} /></Field>
            <Field label="Image description"><Area name="imagePrompt" rows={3} defaultValue={idea.imagePrompt ?? ""} maxLength={1500} /></Field>
            {idea.imageUrl && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="removeImage" className="size-4 accent-[#6d28d9]" /> Remove the image</label>}
            <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? "Saving" : "Save"}</Button><Button type="button" variant="ghost" onClick={() => setEdit(false)}><X /> Cancel</Button></div>
          </form>
        )}
        {!locked && !edit && <div className="mt-3 flex gap-1"><Button variant="ghost" className="min-h-9 px-2.5" disabled={busy} onClick={() => setEdit(true)}><PenLine /> Edit</Button><Button variant="ghost" className="min-h-9 px-2.5 text-destructive" disabled={busy} onClick={async () => { if (!confirm("Remove this post from the plan?")) return; const { error } = await api("DELETE", path); if (error) setProblem(error); await reload(); }}><Trash2 /> Remove</Button></div>}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {idea.imageUrl ? <img src={idea.imageUrl} alt={`AI image for ${idea.topic}`} width={144} height={180} loading="lazy" className="h-44 w-36 rounded-lg object-cover max-sm:col-span-full" /> : idea.format === "image" && <span className="grid h-44 w-36 place-items-center rounded-lg border border-dashed border-hairline text-xs text-muted-ink max-sm:hidden"><span className="grid justify-items-center gap-1.5"><Plus aria-hidden className="size-4" />Image needed</span></span>}
    </li>
  );
}
