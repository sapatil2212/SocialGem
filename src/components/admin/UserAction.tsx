"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog } from "radix-ui";
import { Button } from "@/components/ui/button";

export default function UserAction({ id, email, disabled }: { id: string; email: string; disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ disabled: !disabled }) });
      if (response.status === 401) return window.location.replace("/admin/login");
      if (!response.ok) throw new Error((await response.json()).error);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "That did not work. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger asChild><Button variant="outline" className={disabled ? "min-h-9 px-3 text-sm" : "min-h-9 px-3 text-sm text-destructive"}>{disabled ? "Enable" : "Disable"}</Button></AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-[#080718]/60 backdrop-blur-sm" />
        <AlertDialog.Content className="brand brand-themed fixed top-1/2 left-1/2 z-50 w-[min(440px,92vw)] -translate-1/2 rounded-2xl border border-hairline !bg-card p-6 shadow-2xl">
          <AlertDialog.Title className="!text-xl">{disabled ? "Enable this account?" : "Disable this account?"}</AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-muted-ink [overflow-wrap:anywhere]">{disabled ? `${email} will be able to log in again.` : `${email} will be signed out everywhere and cannot log in. Nothing is deleted.`}</AlertDialog.Description>
          {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild><Button variant="outline">Cancel</Button></AlertDialog.Cancel>
            <Button onClick={save} disabled={busy}>{busy ? "Saving" : disabled ? "Enable account" : "Disable account"}</Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
