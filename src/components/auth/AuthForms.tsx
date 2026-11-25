"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { ArrowRight, CircleCheck, LoaderCircle } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input } from "@/components/ui/field";
import { signInSchema, signUpSchema, type SignIn, type SignUp } from "@/lib/auth-schemas";
import { postAccount } from "./api";
import CodeStep from "./CodeStep";
import { PasswordChecklist, PasswordInput } from "./PasswordField";

const LOGIN_ERRORS: Record<string, string> = {
  InvalidLogin: "That email and password do not match.",
  TooManyAttempts: "Too many attempts. Please wait 15 minutes.",
  EmailNotVerified: "Confirm your email first. We sent you a link when you signed up.",
};
const OFFLINE = "We could not reach the server. Please try again.";

// Sign-up and reset finish on the log in page. The email travels in this tab only, never in the address.
const DONE = { verified: "Email confirmed. Log in to open your dashboard.", reset: "Password changed. Log in with the new one." };
const KEY = "sg-login-email";

export function leaveForLogin(reason: keyof typeof DONE, email: string, next?: string) {
  try {
    sessionStorage.setItem(KEY, email);
  } catch {}
  const query = new URLSearchParams({ done: reason });
  if (next && next !== "/app") query.set("next", next);
  window.location.assign(`/login?${query}`);
}

const never = () => () => {};
function rememberedEmail() {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

type Props = { next: string; error: string; google: boolean; done?: string };

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

export function LoginForm(props: Props) {
  // Waits for the browser, so the remembered email can be filled in without a mismatch.
  const email = useSyncExternalStore(never, rememberedEmail, () => null);
  return <LoginFields key={email === null ? "server" : "browser"} {...props} email={email ?? ""} />;
}

function LoginFields({ next, error, google, done, email }: Props & { email: string }) {
  const [problem, setProblem] = useState(error);
  const [pending, setPending] = useState("");
  const { register, handleSubmit, formState, getValues } = useForm<SignIn>({ resolver: zodResolver(signInSchema), defaultValues: { email, password: "" } });
  const message = done === "verified" || done === "reset" ? DONE[done] : "";

  const submit = async (values: SignIn) => {
    setProblem("");
    try {
      const result = await signIn("credentials", { ...values, redirect: false });
      if (result?.ok && !result.error) {
        try {
          sessionStorage.removeItem(KEY);
        } catch {}
        window.location.assign(next);
        return;
      }
      if (result?.error === "EmailNotVerified") {
        const reply = await postAccount("challenge", values);
        if (reply.ok) setPending(reply.pending!);
        else setProblem(reply.code === "WAIT" ? "Confirm your email first. Use the code we sent, or wait a minute for a new one." : reply.message);
        return;
      }
      setProblem(LOGIN_ERRORS[result?.error ?? ""] ?? OFFLINE);
    } catch {
      setProblem(OFFLINE);
    }
  };

  if (pending) {
    const address = getValues("email");
    return (
      <CodeStep
        email={address}
        pending={pending}
        purpose="verify"
        action="Confirm email"
        onPending={setPending}
        onBack={() => setPending("")}
        onCode={async (code) => {
          const reply = await postAccount("verify", { pending, code });
          if (!reply.ok) return reply.message;
          leaveForLogin("verified", address, next);
        }}
      />
    );
  }

  return (
    <>
      <Switch mode="login" next={next} />
      <Head title="Welcome back" text="Pick up where your calendar left off." />
      <form noValidate onSubmit={handleSubmit(submit)} className="grid gap-4">
        {message && !problem && (
          <p role="status" className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/5 p-3.5 text-sm font-medium text-success"><CircleCheck aria-hidden className="size-4 shrink-0" />{message}</p>
        )}
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

export function SignUpForm({ next, error, google }: Props) {
  const [problem, setProblem] = useState(error);
  const [sent, setSent] = useState<{ email: string; pending: string } | null>(null);
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
    setSent({ email: values.email, pending: reply.pending! });
  };

  if (sent) {
    return (
      <CodeStep
        {...sent}
        purpose="verify"
        action="Confirm email"
        onPending={(pending) => setSent({ ...sent, pending })}
        onBack={() => setSent(null)}
        onCode={async (code) => {
          const reply = await postAccount("verify", { pending: sent.pending, code });
          if (!reply.ok) return reply.message;
          leaveForLogin("verified", sent.email, next);
        }}
      />
    );
  }
  return (
    <>
      <Switch mode="signup" next={next} />
      <Head title="Create your account" text="We will email you a 6-digit code to confirm it is you." />
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
