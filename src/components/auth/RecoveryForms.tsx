"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input } from "@/components/ui/field";
import { forgotSchema, passwordSchema } from "@/lib/auth-schemas";
import { postAccount } from "./api";
import { leaveForLogin, Spinner } from "./AuthForms";
import CodeStep from "./CodeStep";
import { PasswordChecklist, PasswordInput } from "./PasswordField";

export function ForgotForm() {
  const [sent, setSent] = useState<{ email: string; pending: string } | null>(null);
  const [problem, setProblem] = useState("");
  const [password, setPassword] = useState("");
  const [weak, setWeak] = useState("");
  const { register, handleSubmit, formState } = useForm<{ email: string }>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });

  if (sent) {
    return (
      <CodeStep
        {...sent}
        purpose="reset"
        auto={false}
        action="Change password"
        onPending={(pending) => setSent({ ...sent, pending })}
        onBack={() => setSent(null)}
        onCode={async (code) => {
          const check = passwordSchema.safeParse(password);
          setWeak(check.success ? "" : check.error.issues[0].message);
          if (!check.success) return "Choose a stronger password.";
          const reply = await postAccount("reset", { pending: sent.pending, code, password });
          if (!reply.ok) return reply.fields.password ?? reply.message;
          leaveForLogin("reset", sent.email);
        }}
      >
        <Field label="New password" error={weak}>
          <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <PasswordChecklist value={password} />
      </CodeStep>
    );
  }

  return (
    <>
      <h1 className="text-4xl">Reset your password</h1>
      <p className="mt-3 mb-7 text-muted-ink">We will email you a 6-digit code.</p>
      <form
        noValidate
        className="grid gap-4"
        onSubmit={handleSubmit(async ({ email }) => {
          setProblem("");
          const reply = await postAccount("forgot", { email });
          if (reply.ok) setSent({ email, pending: reply.pending! });
          else setProblem(reply.message);
        })}
      >
        {problem && <FormAlert>{problem}</FormAlert>}
        <Field label="Email" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...register("email")} />
        </Field>
        <Button size="lg" disabled={formState.isSubmitting}>{formState.isSubmitting ? <><Spinner /> Sending</> : "Send the code"}</Button>
        <Link href="/login" className="flex min-h-11 items-center justify-center font-semibold text-brand-ink">Back to log in</Link>
      </form>
    </>
  );
}
