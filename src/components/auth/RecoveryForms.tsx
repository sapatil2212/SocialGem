"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input } from "@/components/ui/field";
import { forgotSchema, passwordSchema } from "@/lib/auth-schemas";
import { postAccount } from "./api";
import { CheckEmail, Spinner } from "./AuthForms";
import { PasswordChecklist, PasswordInput } from "./PasswordField";

// The token sits after # so it never reaches server logs or referrers.
const subscribe = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};
const useToken = () => useSyncExternalStore(subscribe, () => window.location.hash.slice(1), () => null);

export function ForgotForm() {
  const [sentTo, setSentTo] = useState("");
  const [problem, setProblem] = useState("");
  const { register, handleSubmit, formState } = useForm<{ email: string }>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });

  if (sentTo) return <CheckEmail email={sentTo} />;
  return (
    <>
      <h1 className="text-4xl">Reset your password</h1>
      <p className="mt-3 mb-7 text-muted-ink">We will email you a link that works for one hour.</p>
      <form
        noValidate
        className="grid gap-4"
        onSubmit={handleSubmit(async ({ email }) => {
          const reply = await postAccount("forgot", { email });
          if (reply.ok) setSentTo(email);
          else setProblem(reply.message);
        })}
      >
        {problem && <FormAlert>{problem}</FormAlert>}
        <Field label="Email" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...register("email")} />
        </Field>
        <Button size="lg" disabled={formState.isSubmitting}>{formState.isSubmitting ? <><Spinner /> Sending</> : "Send the link"}</Button>
        <Link href="/login" className="flex min-h-11 items-center justify-center font-semibold text-brand-ink">Back to log in</Link>
      </form>
    </>
  );
}

function Done({ title, text }: { title: string; text: string }) {
  return (
    <div role="status">
      <CircleCheck aria-hidden className="mb-6 size-14 text-success" />
      <h1 className="text-4xl">{title}</h1>
      <p className="mt-3 mb-7 text-muted-ink">{text}</p>
      <Button asChild size="lg"><Link href="/login">Log in</Link></Button>
    </div>
  );
}

function BadLink({ href, action }: { href: string; action: string }) {
  return (
    <>
      <h1 className="mb-6 text-4xl">This link will not work</h1>
      <FormAlert>It has expired, was already used, or is incomplete.</FormAlert>
      <Button asChild className="mt-6"><Link href={href}>{action}</Link></Button>
    </>
  );
}

const newPassword = z.object({ password: passwordSchema });

export function ResetForm() {
  const token = useToken();
  const [done, setDone] = useState(false);
  const [problem, setProblem] = useState("");
  const { register, handleSubmit, control, formState } = useForm<{ password: string }>({ resolver: zodResolver(newPassword), defaultValues: { password: "" } });
  const password = useWatch({ control, name: "password" });

  if (done) return <Done title="Password changed" text="You have been signed out everywhere else." />;
  if (token === "") return <BadLink href="/forgot-password" action="Get a new link" />;
  return (
    <>
      <h1 className="mb-7 text-4xl">Choose a new password</h1>
      <form
        noValidate
        className="grid gap-4"
        onSubmit={handleSubmit(async (values) => {
          setProblem("");
          const reply = await postAccount("reset", { token, password: values.password });
          if (!reply.ok) return setProblem(reply.fields.token ? "This link is incomplete." : reply.fields.password ?? reply.message);
          history.replaceState(null, "", location.pathname);
          setDone(true);
        })}
      >
        {problem && <FormAlert>{problem} <Link href="/forgot-password" className="underline">Get a new link</Link></FormAlert>}
        <Field label="New password" error={formState.errors.password?.message}>
          <PasswordInput autoComplete="new-password" {...register("password")} />
        </Field>
        <PasswordChecklist value={password} />
        <Button size="lg" disabled={formState.isSubmitting || !token}>{formState.isSubmitting ? <><Spinner /> Saving</> : "Save password"}</Button>
      </form>
    </>
  );
}

// Confirming needs a press, so email scanners that open links cannot use it up.
export function VerifyForm() {
  const token = useToken();
  const [state, setState] = useState<"idle" | "busy" | "done" | "bad">("idle");
  const [problem, setProblem] = useState("");

  if (state === "done") return <Done title="Email confirmed" text="Your account is ready." />;
  if (token === "" || state === "bad") return <BadLink href="/signup" action="Sign up again" />;
  return (
    <>
      <h1 className="text-4xl">Confirm your email</h1>
      <p className="mt-3 mb-7 text-muted-ink">One press and your account is ready.</p>
      {problem && <div className="mb-4"><FormAlert>{problem}</FormAlert></div>}
      <Button
        size="lg"
        disabled={!token || state === "busy"}
        onClick={async () => {
          setState("busy");
          const reply = await postAccount("verify", { token });
          if (reply.ok) return setState("done");
          if (reply.message.startsWith("This link")) return setState("bad");
          setProblem(reply.message);
          setState("idle");
        }}
      >
        {state === "busy" ? <><Spinner /> Confirming</> : "Confirm email"}
      </Button>
    </>
  );
}
