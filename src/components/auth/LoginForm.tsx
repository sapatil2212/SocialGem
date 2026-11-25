"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { LoaderCircle } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";

export default function LoginForm({ next, error, ready }: { next: string; error: string; ready: boolean }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");

  const start = async () => {
    setBusy(true);
    setFailed("");
    try {
      await signIn("google", { callbackUrl: next });
    } catch {
      setFailed("We could not reach the sign-in service. Check your connection and try again.");
      setBusy(false);
    }
  };

  const message = failed || error;
  return (
    <div className="mt-8 grid gap-4">
      {message && <FormAlert>{message}</FormAlert>}
      {!ready && <FormAlert>Google sign-in is not set up on this server yet.</FormAlert>}
      <Button variant="outline" size="lg" onClick={start} disabled={busy || !ready} aria-busy={busy}>
        {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <FcGoogle />}
        {busy ? "Opening Google" : "Continue with Google"}
      </Button>
    </div>
  );
}
