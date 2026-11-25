"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Info } from "lucide-react";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input, NativeSelect } from "@/components/ui/field";
import Logo from "@/components/site/Logo";
import { BUSINESS_TYPES, EMPTY_DRAFT, TIMEZONES, draftSchema, workspaceSchema, type Draft, type Workspace } from "@/lib/onboarding";
import { rememberWorkspace } from "@/lib/workspace-client";
import { cn } from "@/lib/utils";

const STEPS = ["Workspace", "Channels", "Alerts", "Review"];
const NAMES = { facebook: "Facebook Page", instagram: "Instagram" };
const CHOICES = [
  { key: "facebook" as const, Icon: FaFacebook, text: "Pages only. You need to manage the Page." },
  { key: "instagram" as const, Icon: FaInstagram, text: "Business or Creator accounts." },
];
const EASE = [0.22, 1, 0.36, 1] as const;

function readDraft(key: string): Draft {
  try {
    const parsed = draftSchema.safeParse(JSON.parse(localStorage.getItem(key) || "null"));
    if (!parsed.success) return EMPTY_DRAFT;
    return parsed.data.workspace ? parsed.data : { ...parsed.data, step: 0 };
  } catch {
    return EMPTY_DRAFT;
  }
}

function WorkspaceStep({ value, onNext }: { value: Workspace | null; onNext: (w: Workspace) => void }) {
  const { register, handleSubmit, formState } = useForm<Workspace>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: value ?? { name: "", timezone: "Asia/Kolkata" },
  });
  const { errors } = formState;
  return (
    <form noValidate onSubmit={handleSubmit(onNext)} className="grid gap-5">
      {Object.keys(errors).length > 0 && <FormAlert>Check the highlighted fields.</FormAlert>}
      <Field label="Brand or business name" error={errors.name?.message}>
        <Input autoComplete="organization" placeholder="Filter & Co." {...register("name")} />
      </Field>
      <Field label="What kind of business is it?" error={errors.type?.message}>
        <NativeSelect defaultValue="" {...register("type")}>
          <option value="" disabled>Choose one</option>
          {BUSINESS_TYPES.map((t) => <option key={t}>{t}</option>)}
        </NativeSelect>
      </Field>
      <Field label="Time zone" hint="Post times use this time zone." error={errors.timezone?.message}>
        <NativeSelect {...register("timezone")}>{TIMEZONES.map((t) => <option key={t}>{t}</option>)}</NativeSelect>
      </Field>
      <Nav />
    </form>
  );
}

function Nav({ onBack, label = "Continue", busy = false }: { onBack?: () => void; label?: string; busy?: boolean }) {
  return (
    <div className="mt-4 flex gap-3">
      {onBack && <Button type="button" variant="ghost" onClick={onBack}><ArrowLeft /> Back</Button>}
      <Button type="submit" className="ml-auto" disabled={busy} aria-busy={busy}>{label} <ArrowRight /></Button>
    </div>
  );
}

function Panel({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  return (
    <>
      <h1 ref={heading} tabIndex={-1} className="text-3xl outline-none! sm:text-4xl">{title}</h1>
      <p className="mt-3 mb-8 text-muted-ink">{text}</p>
      {children}
    </>
  );
}

function Steps({ storageKey }: { storageKey: string }) {
  const [draft, setDraft] = useState(() => readDraft(storageKey));
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const { step, workspace, channels } = draft;

  const save = (change: Partial<Draft>, message?: string) => {
    const next = { ...draft, ...change };
    setDraft(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      if (message) toast.success(message);
    } catch {
      toast.error("This browser is blocking storage, so your progress will not be kept.");
    }
  };
  const back = () => save({ step: step - 1 });
  const submit = (change: Partial<Draft>) => (e: React.FormEvent) => {
    e.preventDefault();
    save({ ...change, step: step + 1 }, "Step saved on this device");
  };
  const finish = async () => {
    if (!workspace || busy) return;
    setBusy(true);
    setProblem("");
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspace.name, businessType: workspace.type, timezone: workspace.timezone, emailOnFailure: draft.emailOnFailure }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      rememberWorkspace(data.id);
      localStorage.removeItem(storageKey);
      setDone(true);
    } catch (error) {
      setProblem((error as Error).message || "We could not create the workspace. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const at = done ? STEPS.length : step;

  const panels = [
    <Panel key="w" title="Name your workspace" text="One workspace per brand or client. You can add more later.">
      <WorkspaceStep value={workspace} onNext={(w) => save({ workspace: w, step: 1 }, "Step saved on this device")} />
    </Panel>,
    <Panel key="c" title="Where will you post?" text="Choose what you plan to connect. Connecting opens when that part is ready.">
      <form onSubmit={submit({})} className="grid gap-3">
        {CHOICES.map(({ key, Icon, text }) => (
          <label key={key} className="flex cursor-pointer items-center gap-4 rounded-2xl border border-hairline bg-card p-4 has-checked:border-brand has-checked:bg-tint">
            <Icon aria-hidden className="size-7 shrink-0 text-brand-ink" />
            <span className="flex-1"><b className="block font-semibold">{NAMES[key]}</b><span className="text-sm text-muted-ink">{text}</span></span>
            <input
              type="checkbox"
              className="size-5 accent-[#ff6b00]"
              checked={channels.includes(key)}
              onChange={(e) => save({ channels: e.target.checked ? [...channels, key] : channels.filter((c) => c !== key) })}
            />
          </label>
        ))}
        <p className="flex gap-2 text-sm text-muted-ink"><Info aria-hidden className="mt-0.5 size-4 shrink-0" />X is still in testing. You can skip this step.</p>
        <Nav onBack={back} />
      </form>
    </Panel>,
    <Panel key="a" title="Know when something fails" text="You always see failures inside SocialGem.">
      <form onSubmit={submit({})} className="grid gap-3">
        <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-hairline bg-card p-4 has-checked:border-brand has-checked:bg-tint">
          <span className="flex-1"><b className="block font-semibold">Email me too</b><span className="text-sm text-muted-ink">One message per failed post.</span></span>
          <input type="checkbox" className="size-5 accent-[#ff6b00]" checked={draft.emailOnFailure} onChange={(e) => save({ emailOnFailure: e.target.checked })} />
        </label>
        <Nav onBack={back} />
      </form>
    </Panel>,
    <Panel key="r" title="Check the details" text="You can change any of this later.">
      <form onSubmit={(e) => { e.preventDefault(); finish(); }}>
        {problem && <div className="mb-4"><FormAlert>{problem}</FormAlert></div>}
        <dl className="card-elevated divide-y divide-hairline">
          {[
            ["Workspace", workspace?.name, 0],
            ["Business", workspace?.type, 0],
            ["Time zone", workspace?.timezone, 0],
            ["Channels", channels.map((c) => NAMES[c]).join(", ") || "None yet", 1],
            ["Failure emails", draft.emailOnFailure ? "On" : "Off", 2],
          ].map(([label, value, to]) => (
            <div key={label} className="flex flex-wrap items-center gap-x-4 px-5 py-2.5">
              <dt className="w-32 text-muted-ink">{label}</dt>
              <dd className="flex-1 font-semibold [overflow-wrap:anywhere]">{value}</dd>
              <button type="button" aria-label={`Edit ${label}`} onClick={() => save({ step: to as number })} className="min-h-11 cursor-pointer font-semibold text-brand-ink underline-offset-4 hover:underline">Edit</button>
            </div>
          ))}
        </dl>
        <Nav onBack={back} label={busy ? "Creating" : "Finish"} busy={busy} />
      </form>
    </Panel>,
  ];

  return (
    <div className="grid min-h-dvh lg:grid-cols-[320px_1fr]">
      <aside className="bg-navy p-6 text-white lg:p-10">
        <Link href="/" aria-label="SocialGem home"><Logo /></Link>
        <div role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={4} aria-valuenow={at} className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/15 lg:mt-14">
          <motion.div className="h-full origin-left bg-[#ff6b00]" initial={false} animate={{ scaleX: at / STEPS.length }} transition={{ duration: 0.45, ease: EASE }} />
        </div>
        <ol className="mt-8 hidden gap-1 lg:grid">
          {STEPS.map((name, i) => (
            <li key={name} aria-current={i === at ? "step" : undefined} className={cn("flex items-center gap-3.5 rounded-xl px-3 py-2.5", i === at ? "bg-[#ff6b00]/15 font-semibold" : "text-white/70")}>
              <span className={cn("grid size-7 place-items-center rounded-full border text-sm", i < at ? "border-[#ff6b00] bg-[#ff6b00] text-navy" : "border-white/35")}>
                {i < at ? <Check aria-hidden className="size-4" /> : i + 1}
              </span>
              {name}{i < at && <span className="sr-only">, done</span>}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-white/75 lg:hidden">{done ? "Done" : `Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}</p>
      </aside>
      <main className="flex px-6 py-10 sm:px-12">
        <div className="m-auto w-full max-w-xl">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={done ? "done" : step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.22, ease: EASE }}>
              {done ? (
                <div className="text-center">
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="mx-auto mb-8 grid size-20 place-items-center rounded-full bg-tint-strong text-brand-ink"><Check aria-hidden className="size-9" /></motion.span>
                  <Panel title={`${workspace?.name} is ready`} text="Your workspace is saved. Next, connect your channels and plan your first post.">
                    <Button asChild size="lg"><Link href="/app">Open the calendar <ArrowRight /></Link></Button>
                  </Panel>
                </div>
              ) : panels[step]}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

const subscribe = () => () => {};

export default function Wizard({ userKey }: { userKey: string }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  return (
    <MotionConfig reducedMotion="user">
      {ready ? (
        <Steps storageKey={`socialgem-setup-${userKey}`} />
      ) : (
        <div className="grid min-h-dvh lg:grid-cols-[320px_1fr]" aria-busy="true" aria-label="Loading setup">
          <div className="bg-navy" />
          <div className="m-auto grid w-full max-w-xl animate-pulse gap-5 p-8 motion-reduce:animate-none">
            <div className="h-9 w-2/3 rounded-lg bg-tint-strong" /><div className="h-11 rounded-xl bg-tint-strong" /><div className="h-11 rounded-xl bg-tint-strong" />
          </div>
        </div>
      )}
      <Toaster position="top-right" richColors />
    </MotionConfig>
  );
}
