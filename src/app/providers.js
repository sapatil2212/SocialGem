"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import { ConfirmHost } from "@/components/ui/confirm";

export function Providers({ children }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {children}
        <ConfirmHost />
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: "bg-white dark:bg-[#1c1938] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-[#302c52] shadow-lg rounded-xl text-xs font-medium",
            duration: 3500,
          }}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}
