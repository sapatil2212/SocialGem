"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { AlertDialog } from "radix-ui";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// One dialog for the whole app, in place of the browser's confirm() and alert().
// `askConfirm` resolves true or false; `showAlert` resolves when it is closed.

type Tone = "danger" | "default";
type Request = {
  id: number;
  kind: "confirm" | "alert";
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  tone: Tone;
  resolve: (ok: boolean) => void;
};
export type ConfirmOptions = { title: string; body?: ReactNode; confirmLabel?: string; cancelLabel?: string; tone?: Tone };

let current: Request | null = null;
let counter = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function open(kind: Request["kind"], options: ConfirmOptions) {
  return new Promise<boolean>((resolve) => {
    // A second question answers the first with "no", so nothing is left waiting.
    current?.resolve(false);
    current = {
      id: ++counter, kind, title: options.title, body: options.body, tone: options.tone ?? "default", resolve,
      confirmLabel: options.confirmLabel ?? (kind === "alert" ? "OK" : "Confirm"), cancelLabel: options.cancelLabel ?? "Cancel",
    };
    emit();
  });
}

function close(ok: boolean) {
  const request = current;
  if (!request) return;
  current = null;
  emit();
  request.resolve(ok);
}

export const askConfirm = (options: ConfirmOptions) => open("confirm", options);
export const showAlert = (options: Omit<ConfirmOptions, "cancelLabel">) => open("alert", options).then(() => undefined);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Mounted once, in the root providers. */
export function ConfirmHost() {
  const request = useSyncExternalStore(subscribe, () => current, () => null);
  const danger = request?.tone === "danger";
  const Icon = request?.kind === "alert" ? (danger ? CircleAlert : Info) : danger ? TriangleAlert : Info;
  return (
    <AlertDialog.Root open={Boolean(request)} onOpenChange={(next) => !next && close(false)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[90] bg-[#080718]/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in motion-reduce:animate-none" />
        {request && (
          <AlertDialog.Content
            key={request.id}
            // Escape and outside clicks count as "no".
            onEscapeKeyDown={() => close(false)}
            className="brand brand-themed fixed top-1/2 left-1/2 z-[91] w-[min(420px,calc(100vw-2rem))] -translate-1/2 rounded-2xl border border-hairline !bg-card p-6 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 motion-reduce:animate-none"
          >
            <div className="flex gap-4">
              <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-xl", danger ? "bg-destructive/10 text-destructive" : "bg-tint-strong text-brand-ink")}>
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <AlertDialog.Title className="!text-[1.05rem] !leading-snug !tracking-tight">{request.title}</AlertDialog.Title>
                {request.body ? (
                  <AlertDialog.Description asChild>
                    <div className="mt-1.5 text-sm text-muted-ink [overflow-wrap:anywhere]">{request.body}</div>
                  </AlertDialog.Description>
                ) : (
                  <AlertDialog.Description className="sr-only">{request.title}</AlertDialog.Description>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {request.kind === "confirm" && (
                <AlertDialog.Cancel asChild>
                  <button type="button" onClick={() => close(false)} className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-hairline bg-card px-4 text-sm font-medium text-foreground hover:border-foreground/40">
                    {request.cancelLabel}
                  </button>
                </AlertDialog.Cancel>
              )}
              <AlertDialog.Action asChild>
                <button
                  type="button"
                  onClick={() => close(true)}
                  className={cn("inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg px-4 text-sm font-medium text-white", // Fixed red, so white text stays readable in the dark theme too.
                    danger ? "bg-[#c4262e] hover:bg-[#a51f26]" : "bg-brand hover:bg-brand-hover")}
                >
                  {request.confirmLabel}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        )}
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
