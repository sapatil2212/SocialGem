"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { setWorkspace } from "@/lib/workspace-client";

type Item = { id: string; name: string };
const Context = createContext<{ current: Item; all: Item[] } | null>(null);

export const useWorkspaces = () => useContext(Context);

export default function WorkspaceProvider({ current, all, children }: { current: Item; all: Item[]; children: ReactNode }) {
  // Runs before any child effect fetches. In the browser only: the module is shared on the server.
  useState(() => {
    if (typeof window !== "undefined") setWorkspace(current.id);
  });
  return <Context.Provider value={{ current, all }}>{children}</Context.Provider>;
}
