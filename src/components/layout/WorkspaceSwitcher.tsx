"use client";

import { DropdownMenu } from "radix-ui";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { rememberWorkspace } from "@/lib/workspace-client";
import { useWorkspaces } from "./WorkspaceProvider";

const item = "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-tint";

export default function WorkspaceSwitcher() {
  const data = useWorkspaces();
  if (!data) return null;

  const choose = (id: string) => {
    rememberWorkspace(id);
    window.location.assign("/app");
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex min-h-12 w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border border-hairline bg-background px-3 text-sm font-semibold hover:border-brand/40" aria-label={`Workspace: ${data.current.name}. Switch`}>
        <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-lg bg-tint-strong text-xs text-brand-ink">{data.current.name.charAt(0).toUpperCase()}</span>
        <span className="truncate">{data.current.name}</span>
        <ChevronsUpDown aria-hidden className="ml-auto size-4 shrink-0 text-muted-ink" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className="brand brand-themed z-[60] max-h-80 w-60 overflow-auto rounded-2xl border border-hairline !bg-card p-1.5 shadow-xl">
          {data.all.map((w) => (
            <DropdownMenu.Item key={w.id} className={item} onSelect={() => choose(w.id)}>
              <span className="truncate">{w.name}</span>
              {w.id === data.current.id && <Check aria-hidden className="ml-auto size-4 shrink-0" />}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1.5 h-px bg-hairline" />
          <DropdownMenu.Item className={item} onSelect={() => window.location.assign("/onboarding?new=1")}>
            <Plus aria-hidden className="size-4" /> New workspace
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
