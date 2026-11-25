"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ArrowLeft, ArrowRight, LoaderCircle, MailCheck, ShieldCheck } from "lucide-react";
import { PasswordInput } from "@/components/auth/PasswordField";
import Logo from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input } from "@/components/ui/field";

async function send(action: string, body: object) {
  try {
    const response = await fetch(`/api/admin/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    return response.ok ? { ok: true as const, pending: data.pending as string } : { ok: false as const, message: (data.error?.message as string) ?? "Something went wrong." };
  } catch {
    return { ok: false as const, message: "We could not reach the server. Please try again." };
  }
}

export default function AdminLogin() {
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    const result = pending ? await send("verify", { pending, code: String(form.get("code")).trim() }) : await send("login", { email: form.get("email"), password: form.get("password") });
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
    } else if (pending) {
      // A full load, so nothing from before sign-in is reused.
      window.location.replace("/admin");
    } else {
      setPending(result.pending);
      setBusy(false);
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-navy px-5 py-12">
        <div aria-hidden className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-[#0891d1]/40 blur-[110px]" />
        <div aria-hidden className="absolute -right-32 -bottom-40 size-[36rem] rounded-full bg-[#b3157f]/40 blur-[110px]" />
        <div className="relative w-full max-w-md">
          <Link href="/" aria-label="SocialGem home" className="mx-auto mb-8 block w-fit"><Logo tone="dark" className="h-16" /></Link>
          <section className="rounded-3xl border border-white/20 bg-card p-7 shadow-2xl sm:p-9">
            <span className="flex w-fit items-center gap-2 rounded-full bg-tint-strong px-3 py-1 text-sm font-semibold text-brand-ink"><ShieldCheck aria-hidden className="size-4" /> Restricted area</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={pending ? "code" : "login"} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <h1 className="mt-5 !text-3xl">{pending ? "Check your email" : "Admin log in"}</h1>
                <p className="mt-2 text-muted-ink">{pending ? "Enter the 6-digit code we sent. It works for 10 minutes." : "Your password, then a code sent to your email."}</p>
                <form onSubmit={submit} className="mt-7 grid gap-5" noValidate>
                  {error && <FormAlert>{error}</FormAlert>}
                  {pending ? (
                    <Field label="Sign-in code"><Input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus className="text-center text-2xl font-semibold tracking-[0.4em] tabular-nums" /></Field>
                  ) : (
                    <>
                      <Field label="Email"><Input name="email" type="email" autoComplete="username" /></Field>
                      <Field label="Password"><PasswordInput name="password" autoComplete="current-password" /></Field>
                    </>
                  )}
                  <Button type="submit" size="lg" disabled={busy} aria-busy={busy}>
                    {busy ? <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" /> : pending ? <MailCheck aria-hidden /> : null}
                    {pending ? "Open dashboard" : "Continue"}{!pending && !busy && <ArrowRight aria-hidden />}
                  </Button>
                  {pending && <Button type="button" variant="ghost" onClick={() => { setPending(""); setError(""); }}><ArrowLeft aria-hidden /> Start again</Button>}
                </form>
              </motion.div>
            </AnimatePresence>
          </section>
          <p className="mt-6 text-center text-sm text-white/65">Admin sign-ins and changes are recorded.</p>
        </div>
      </main>
    </MotionConfig>
  );
}
