"use client";

import { useState, type ComponentProps } from "react";
import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import { Input } from "@/components/ui/field";
import { PASSWORD_RULES } from "@/lib/auth-schemas";
import { cn } from "@/lib/utils";

export function PasswordInput(props: ComponentProps<"input">) {
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);
  return (
    <span className="grid gap-1.5">
      <span className="relative block">
        <Input
          {...props}
          type={shown ? "text" : "password"}
          className="pr-12"
          onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
        />
        <button
          type="button"
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          onClick={() => setShown((s) => !s)}
          className="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center rounded-xl text-muted-ink hover:text-foreground"
        >
          {shown ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </span>
      {caps && <span role="status" className="text-sm font-medium text-warning">Caps Lock is on.</span>}
    </span>
  );
}

export function PasswordChecklist({ value }: { value: string }) {
  const passed = PASSWORD_RULES.filter((rule) => rule.test(value)).length;
  return (
    <div className="grid gap-2.5">
      <div className="h-1.5 overflow-hidden rounded-full bg-tint-strong" aria-hidden>
        <motion.div
          className={cn("h-full origin-left", passed === PASSWORD_RULES.length ? "bg-success" : "bg-brand")}
          initial={false}
          animate={{ scaleX: passed / PASSWORD_RULES.length }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <ul className="grid gap-1 text-sm">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(value);
          return (
            <li key={rule.label} className={cn("flex items-center gap-2", ok ? "text-success" : "text-muted-ink")}>
              {ok ? <Check aria-hidden className="size-4" /> : <Circle aria-hidden className="size-4" />}
              {rule.label}<span className="sr-only">{ok ? ", met" : ", not met yet"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
