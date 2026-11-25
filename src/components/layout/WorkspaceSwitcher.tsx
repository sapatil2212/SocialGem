"use client";

import { DropdownMenu } from "radix-ui";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { rememberWorkspace } from "@/lib/workspace-client";
import { useWorkspaces } from "./WorkspaceProvider";

const item = "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-zinc-100 dark:data-[highlighted]:bg-[#2a2929]";

export default function WorkspaceSwitcher() {
  const data = useWorkspaces();
  if (!data) return null;

  const choose = (id: string) => {
    rememberWorkspace(id);
    window.location.assign("/app");
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex max-w-40 cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:border-[#2e2d2d] dark:bg-[#201f1f] dark:text-white" aria-label={`Workspace: ${data.current.name}. Switch`}>
        <span className="truncate">{data.current.name}</span>
        <ChevronsUpDown aria-hidden className="size-3.5 shrink-0" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 max-h-80 w-60 overflow-auto rounded-xl border border-zinc-200 bg-white p-1.5 text-zinc-900 dark:border-[#2e2d2d] dark:bg-[#1a1919] dark:text-white">
          {data.all.map((w) => (
            <DropdownMenu.Item key={w.id} className={item} onSelect={() => choose(w.id)}>
              <span className="truncate">{w.name}</span>
              {w.id === data.current.id && <Check aria-hidden className="ml-auto size-4 shrink-0" />}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1.5 h-px bg-zinc-200 dark:bg-[#2e2d2d]" />
          <DropdownMenu.Item className={item} onSelect={() => window.location.assign("/onboarding?new=1")}>
            <Plus aria-hidden className="size-4" /> New workspace
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
