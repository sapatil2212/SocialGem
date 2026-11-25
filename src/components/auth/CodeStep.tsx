"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useAnimationControls } from "motion/react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { postAccount } from "./api";
import { Spinner } from "./AuthForms";

const LENGTH = 6;
const WAIT = 60;

// One real input under six boxes: paste, autofill and screen readers all work.
export function CodeInput({ value, onChange, invalid, disabled }: { value: string; onChange: (v: string) => void; invalid?: boolean; disabled?: boolean }) {
  const [focused, setFocused] = useState(false);
  const shake = useAnimationControls();
  useEffect(() => {
    if (invalid) shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.35 } });
  }, [invalid, shake]);

  return (
    <motion.div animate={shake} className="relative">
      <input
        aria-label="6-digit code"
        aria-invalid={invalid || undefined}
        autoComplete="one-time-code"
        inputMode="numeric"
        autoFocus
        maxLength={LENGTH + 4}
        disabled={disabled}
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, LENGTH))}
        className="absolute inset-0 z-10 w-full cursor-text opacity-0"
      />
      <div aria-hidden className="grid grid-cols-6 gap-2">
        {Array.from({ length: LENGTH }, (_, i) => {
          const active = focused && i === Math.min(value.length, LENGTH - 1);
          return (
            <div
              key={i}
              className={cn(
                "grid h-14 place-items-center rounded-xl border bg-card text-2xl font-semibold tabular-nums transition-colors",
                invalid ? "border-destructive" : active ? "border-brand outline-3 outline-brand/30" : value[i] ? "border-foreground/50" : "border-foreground/25"
              )}
            >
              {value[i] ? (
                <motion.span key={value[i]} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 400, damping: 22 }}>{value[i]}</motion.span>
              ) : (
                active && <span className="h-6 w-px animate-pulse bg-foreground motion-reduce:animate-none" />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

type Props = {
  email: string;
  pending: string;
  purpose: "verify" | "reset";
  onPending: (pending: string) => void;
  onBack: () => void;
  /** Called with a complete code. Returns an error message, or nothing on success. */
  onCode: (code: string) => Promise<string | void>;
  action: string;
  children?: ReactNode;
  auto?: boolean;
};

export default function CodeStep({ email, pending, purpose, onPending, onBack, onCode, action, children, auto = true }: Props) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [badCode, setBadCode] = useState(false);
  const [note, setNote] = useState("");
  const [left, setLeft] = useState(WAIT);
  const heading = useRef<HTMLHeadingElement>(null);
  const sending = useRef(false);

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  const submit = async (value: string) => {
    if (value.length !== LENGTH || sending.current) return;
    sending.current = true;
    setBusy(true);
    setProblem("");
    setNote("");
    const error = await onCode(value);
    sending.current = false;
    if (!error) return;
    setBusy(false);
    setProblem(error);
    if (/code/i.test(error)) {
      setBadCode(true);
      setCode("");
    }
  };

  const again = async () => {
    setProblem("");
    setNote("");
    const reply = await postAccount("resend", { purpose, pending });
    if (!reply.ok) return setProblem(reply.message);
    onPending(reply.pending!);
    setCode("");
    setBadCode(false);
    setLeft(WAIT);
    setNote("A new code is on its way. Older codes no longer work.");
  };

  return (
    <>
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="mb-6 grid size-16 place-items-center rounded-2xl bg-tint-strong text-brand-ink">
        <MailCheck aria-hidden className="size-7" />
      </motion.span>
      <h1 ref={heading} className="text-4xl">Enter your code</h1>
      <p className="mt-3 mb-7 text-muted-ink">
        If <b className="font-semibold text-foreground [overflow-wrap:anywhere]">{email}</b> can be used, a 6-digit code is on its way. It works for 10 minutes. Check spam too.
      </p>
      <form
        noValidate
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length !== LENGTH) setProblem("Enter all 6 digits of the code.");
          else submit(code);
        }}
      >
        {problem && <FormAlert>{problem}</FormAlert>}
        <CodeInput
          value={code}
          invalid={badCode}
          disabled={busy}
          onChange={(v) => {
            setCode(v);
            setBadCode(false);
            if (auto && v.length === LENGTH) submit(v);
          }}
        />
        {children}
        <Button size="lg" disabled={busy} aria-busy={busy}>{busy ? <><Spinner /> Checking</> : action}</Button>
        <p role="status" className="min-h-6 text-sm text-success empty:hidden">{note}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={onBack} disabled={busy}><ArrowLeft /> Back</Button>
          <Button type="button" variant="ghost" onClick={again} disabled={left > 0 || busy}>
            {left > 0 ? `Send again in ${left}s` : "Send a new code"}
          </Button>
        </div>
      </form>
    </>
  );
}
