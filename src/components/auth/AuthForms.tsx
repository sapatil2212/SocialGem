"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { ArrowRight, LoaderCircle, MailCheck } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input } from "@/components/ui/field";
import { signInSchema, signUpSchema, type SignIn, type SignUp } from "@/lib/auth-schemas";
import { postAccount } from "./api";
import { PasswordChecklist, PasswordInput } from "./PasswordField";

const LOGIN_ERRORS: Record<string, string> = {
  InvalidLogin: "That email and password do not match.",
  TooManyAttempts: "Too many attempts. Please wait 15 minutes.",
  EmailNotVerified: "Confirm your email first. We sent you a link when you signed up.",
};
const OFFLINE = "We could not reach the server. Please try again.";

type Props = { next: string; error: string; google: boolean };

export function Spinner() {
  return <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />;
}

function Google({ next, enabled, onError }: { next: string; enabled: boolean; onError: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={busy || !enabled}
        aria-busy={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await signIn("google", { callbackUrl: next });
          } catch {
            onError(OFFLINE);
            setBusy(false);
          }
        }}
      >
        {busy ? <Spinner /> : <FcGoogle />} {busy ? "Opening Google" : "Continue with Google"}
      </Button>
      {!enabled && <p className="-mt-2 text-sm text-muted-ink">Google sign-in is not set up on this server yet.</p>}
      <p className="flex items-center gap-4 text-sm text-muted-ink before:h-px before:flex-1 before:bg-hairline after:h-px after:flex-1 after:bg-hairline">or use email</p>
    </>
  );
}

function Switch({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const query = next === "/app" ? "" : `?next=${encodeURIComponent(next)}`;
  return (
    <nav aria-label="Account" className="mb-9 flex gap-1 rounded-xl border border-hairline bg-card p-1">
      {([["login", "Log in"], ["signup", "Sign up"]] as const).map(([key, label]) => (
        <Link key={key} href={`/${key}${query}`} aria-current={mode === key ? "page" : undefined} className="relative grid min-h-11 flex-1 place-items-center rounded-lg font-semibold">
          {mode === key && <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-lg bg-navy" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
          <span className={mode === key ? "relative text-white" : "relative"}>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function Head({ title, text }: { title: string; text: ReactNode }) {
  return (
    <>
      <h1 className="text-4xl">{title}</h1>
      <p className="mt-3 mb-7 text-muted-ink">{text}</p>
    </>
  );
}

export function LoginForm({ next, error, google }: Props) {
  const [problem, setProblem] = useState(error);
  const { register, handleSubmit, formState } = useForm<SignIn>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });

  const submit = async (values: SignIn) => {
    setProblem("");
    try {
      const result = await signIn("credentials", { ...values, redirect: false });
      if (result?.ok && !result.error) window.location.assign(next);
      else setProblem(LOGIN_ERRORS[result?.error ?? ""] ?? OFFLINE);
    } catch {
      setProblem(OFFLINE);
    }
  };

  return (
    <>
      <Switch mode="login" next={next} />
      <Head title="Welcome back" text="Pick up where your calendar left off." />
      <form noValidate onSubmit={handleSubmit(submit)} className="grid gap-4">
        {problem && <FormAlert>{problem}</FormAlert>}
        <Google next={next} enabled={google} onError={setProblem} />
        <Field label="Email" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" placeholder="you@business.com" {...register("email")} />
        </Field>
        <Field label="Password" error={formState.errors.password?.message}>
          <PasswordInput autoComplete="current-password" {...register("password")} />
        </Field>
        <Link href="/forgot-password" className="flex min-h-11 w-fit items-center font-semibold text-brand-ink underline-offset-4 hover:underline">Forgot your password?</Link>
        <Button size="lg" className="shimmer" disabled={formState.isSubmitting} aria-busy={formState.isSubmitting}>
          {formState.isSubmitting ? <><Spinner /> Logging in</> : <>Log in <ArrowRight /></>}
        </Button>
      </form>
    </>
  );
}

export function CheckEmail({ email }: { email: string }) {
  return (
    <div role="status">
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="mb-7 grid size-16 place-items-center rounded-2xl bg-tint-strong text-brand-ink">
        <MailCheck aria-hidden className="size-7" />
      </motion.span>
      <Head title="Check your inbox" text={<>If <b className="font-semibold text-foreground">{email}</b> can be used, a link is on its way. Look in spam too.</>} />
      <Button asChild variant="outline"><Link href="/login">Back to log in</Link></Button>
    </div>
  );
}

export function SignUpForm({ next, error, google }: Props) {
  const [problem, setProblem] = useState(error);
  const [sentTo, setSentTo] = useState("");
  const { register, handleSubmit, setError, control, formState } = useForm<SignUp>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const password = useWatch({ control, name: "password" });
  const { errors, isSubmitting } = formState;

  const submit = async (values: SignUp) => {
    setProblem("");
    const reply = await postAccount("signup", values);
    if (!reply.ok) {
      setProblem(reply.message);
      for (const [name, message] of Object.entries(reply.fields)) {
        if (name === "name" || name === "email" || name === "password") setError(name, { message });
      }
      return;
    }
    if (reply.result === "check-email") return setSentTo(values.email);
    const result = await signIn("credentials", { email: values.email, password: values.password, redirect: false }).catch(() => null);
    window.location.assign(result?.ok ? next : "/login");
  };

  if (sentTo) return <CheckEmail email={sentTo} />;
  return (
    <>
      <Switch mode="signup" next={next} />
      <Head title="Create your account" text="Set up your first brand in about two minutes." />
      <form noValidate onSubmit={handleSubmit(submit)} className="grid gap-4">
        {problem && <FormAlert>{problem}</FormAlert>}
        <Google next={next} enabled={google} onError={setProblem} />
        <Field label="Your name" error={errors.name?.message}>
          <Input autoComplete="name" placeholder="Asha Patil" {...register("name")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" placeholder="you@business.com" {...register("email")} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <PasswordInput autoComplete="new-password" {...register("password")} />
        </Field>
        <PasswordChecklist value={password} />
        <Button size="lg" className="shimmer mt-1" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? <><Spinner /> Creating your account</> : <>Create account <ArrowRight /></>}
        </Button>
        <p className="text-sm text-muted-ink">
          SocialGem is in development. See the draft <Link href="/terms" className="underline">terms</Link> and <Link href="/privacy" className="underline">privacy policy</Link>.
        </p>
      </form>
    </>
  );
}
