"use client";

import { cloneElement, useId, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { Label } from "radix-ui";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "w-full min-h-11 rounded-xl border border-foreground/25 bg-card px-3.5 text-base text-foreground placeholder:text-muted-ink aria-invalid:border-destructive";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, className)} {...props} />;
}

type FieldProps = { label: string; hint?: string; error?: string; children: ReactElement<Record<string, unknown>> };

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const note = error || hint;
  return (
    <div className="grid gap-1.5">
      <Label.Root htmlFor={id} className="text-sm font-semibold">{label}</Label.Root>
      {cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": note ? `${id}-note` : undefined,
      })}
      {note && (
        <p id={`${id}-note`} className={cn("text-sm", error ? "font-medium text-destructive" : "text-muted-ink")}>
          {note}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm text-destructive">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
