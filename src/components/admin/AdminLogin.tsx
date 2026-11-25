"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { PasswordInput } from "@/components/auth/PasswordField";
import Logo from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input } from "@/components/ui/field";

export default function AdminLogin() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      // A full load, so nothing from before sign-in is reused.
      if (response.ok) return window.location.replace("/admin");
      setError((await response.json()).error?.message ?? "Something went wrong.");
    } catch {
      setError("We could not reach the server. Please try again.");
    }
    setBusy(false);
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-navy px-5 py-12">
      <div aria-hidden className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-[#0891d1]/40 blur-[110px]" />
      <div aria-hidden className="absolute -right-32 -bottom-40 size-[36rem] rounded-full bg-[#b3157f]/40 blur-[110px]" />
      <div className="relative w-full max-w-sm">
        <Link href="/" aria-label="SocialGem home" className="mx-auto mb-8 block w-fit"><Logo tone="dark" className="h-13" /></Link>
        <section className="rounded-2xl border border-white/20 bg-card p-7 shadow-2xl sm:p-9">
          <span className="flex w-fit items-center gap-2 rounded-full bg-tint-strong px-3 py-1 text-sm font-semibold text-brand-ink"><ShieldCheck aria-hidden className="size-4" /> Restricted area</span>
          <h1 className="mt-5 !text-2xl">Admin log in</h1>
          <p className="mt-2 text-muted-ink">Use your admin email and password.</p>
          <form onSubmit={submit} className="mt-7 grid gap-5" noValidate>
            {error && <FormAlert>{error}</FormAlert>}
            <Field label="Email"><Input name="email" type="email" autoComplete="username" /></Field>
            <Field label="Password"><PasswordInput name="password" autoComplete="current-password" /></Field>
            <Button type="submit" size="lg" disabled={busy} aria-busy={busy}>
              {busy && <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />}
              {busy ? "Opening dashboard" : "Log in"}{!busy && <ArrowRight aria-hidden />}
            </Button>
          </form>
        </section>
        <p className="mt-6 text-center text-sm text-white/65">Admin sign-ins and changes are recorded.</p>
      </div>
    </main>
  );
}
