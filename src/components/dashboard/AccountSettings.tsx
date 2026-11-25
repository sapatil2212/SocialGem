"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { Dialog } from "radix-ui";
import { CircleCheck, KeyRound, LoaderCircle, LogOut } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { PasswordInput } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input } from "@/components/ui/field";

type Details = { name: string; email: string; image: string | null; password: boolean; google: boolean };
type Props = { details: Details; googleReady: boolean; error: string; linked: boolean };

async function call(method: string, path: string, body?: object) {
  try {
    const response = await fetch(path, { method, ...(body && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
    if (response.ok) return "";
    return ((await response.json()).error as string) || "That did not work. Please try again.";
  } catch {
    return "We could not reach the server. Please try again.";
  }
}

function Panel({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 rounded-2xl border border-hairline bg-card p-6 lg:grid-cols-[260px_1fr] lg:gap-10">
      <div><h2 className="!text-lg">{title}</h2><p className="mt-1.5 text-sm text-muted-ink">{text}</p></div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

const row = "flex flex-wrap items-center gap-4 rounded-xl border border-hairline p-4";

export default function AccountSettings({ details, googleReady, error, linked }: Props) {
  const router = useRouter();
  const [problem, setProblem] = useState(error);
  const [done, setDone] = useState(linked && details.google ? "Google is connected. You can now log in with it." : "");
  const [busy, setBusy] = useState("");
  const [ask, setAsk] = useState<"" | "connect" | "disconnect">("");
  const [askProblem, setAskProblem] = useState("");

  const clear = () => {
    setProblem("");
    setDone("");
  };

  const rename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clear();
    setBusy("name");
    const message = await call("PATCH", "/api/me", { name: new FormData(event.currentTarget).get("name") });
    setBusy("");
    if (message) return setProblem(message);
    setDone("Name saved.");
    router.refresh();
  };

  const confirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password");
    clear();
    setAskProblem("");
    setBusy("google");
    const message = await call(ask === "connect" ? "POST" : "DELETE", "/api/me/google", { password });
    if (message) {
      setBusy("");
      return setAskProblem(message);
    }
    if (ask === "connect") {
      await signIn("google", { callbackUrl: "/account?linked=1" }).catch(() => {
        setBusy("");
        setAskProblem("We could not open Google. Please try again.");
      });
      return;
    }
    setBusy("");
    setAsk("");
    setDone("Google is disconnected.");
    router.refresh();
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-4 p-4 sm:p-6">
      {problem && <FormAlert>{problem}</FormAlert>}
      {done && <p role="status" className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/5 p-3.5 text-sm font-medium text-success"><CircleCheck aria-hidden className="size-4 shrink-0" />{done}</p>}

      <Panel title="Profile" text="Your name as teammates see it.">
        <form onSubmit={rename} className="grid gap-4">
          <Field label="Name"><Input name="name" defaultValue={details.name} maxLength={80} autoComplete="name" /></Field>
          <Field label="Email" hint="This is the address you sign in with."><Input value={details.email} readOnly /></Field>
          <Button type="submit" className="w-fit" disabled={busy === "name"}>{busy === "name" ? "Saving" : "Save name"}</Button>
        </form>
      </Panel>

      <Panel title="Ways to log in" text="Keep at least one that you can always reach.">
        <div className="grid gap-3">
          <div className={row}>
            <span className="grid size-11 place-items-center rounded-xl border border-hairline bg-white"><FcGoogle className="size-5" /></span>
            <span className="min-w-0 flex-1"><b className="block font-semibold">Google</b><span className="text-sm text-muted-ink">{details.google ? "Connected" : googleReady ? "Not connected" : "Not set up on this server yet"}</span></span>
            {details.google ? (
              details.password ? <Button variant="outline" onClick={() => setAsk("disconnect")}>Disconnect</Button> : <span className="text-sm text-muted-ink">Set a password to disconnect</span>
            ) : (
              <Button variant="outline" disabled={!googleReady || !details.password} onClick={() => setAsk("connect")}>Connect</Button>
            )}
          </div>
          <div className={row}>
            <span className="grid size-11 place-items-center rounded-xl border border-hairline text-brand-ink"><KeyRound aria-hidden className="size-5" /></span>
            <span className="min-w-0 flex-1"><b className="block font-semibold">Password</b><span className="text-sm text-muted-ink">{details.password ? "Set" : "Not set. We will email you a code to create one."}</span></span>
            <Button asChild variant="outline"><Link href="/forgot-password">{details.password ? "Change" : "Set password"}</Link></Button>
          </div>
        </div>
      </Panel>

      <Panel title="Sessions" text="Useful if you lost a device or used a shared computer.">
        <Button
          variant="outline"
          disabled={busy === "sessions"}
          onClick={async () => {
            clear();
            setBusy("sessions");
            const message = await call("DELETE", "/api/me/sessions");
            if (message) {
              setBusy("");
              return setProblem(message);
            }
            await signOut({ callbackUrl: "/login" });
          }}
        >
          <LogOut aria-hidden /> Log out everywhere
        </Button>
      </Panel>

      <Dialog.Root open={Boolean(ask)} onOpenChange={(open) => { if (!open && !busy) { setAsk(""); setAskProblem(""); } }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[#080718]/60 backdrop-blur-sm" />
          <Dialog.Content className="brand brand-themed fixed top-1/2 left-1/2 z-50 w-[min(440px,92vw)] -translate-1/2 rounded-2xl border border-hairline !bg-card p-6 shadow-2xl">
            <Dialog.Title className="!text-xl">{ask === "disconnect" ? "Disconnect Google?" : "Connect Google"}</Dialog.Title>
            <Dialog.Description className="mt-2 text-muted-ink">{ask === "disconnect" ? "You will log in with your email and password. Enter your password to confirm." : "Enter your password to confirm it is you. Google opens next."}</Dialog.Description>
            <form onSubmit={confirm} className="mt-5 grid gap-4">
              {askProblem && <FormAlert>{askProblem}</FormAlert>}
              <Field label="Password"><PasswordInput name="password" autoComplete="current-password" /></Field>
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild><Button type="button" variant="outline" disabled={busy === "google"}>Cancel</Button></Dialog.Close>
                <Button type="submit" disabled={busy === "google"}>{busy === "google" && <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />}{ask === "disconnect" ? "Disconnect" : "Continue"}</Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
