"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, LogOut, ScrollText, ShieldCheck, Users } from "lucide-react";
import Logo from "@/components/site/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const LINKS = [
  ["/admin", "Overview", LayoutDashboard],
  ["/admin/users", "Users", Users],
  ["/admin/workspaces", "Workspaces", Building2],
  ["/admin/audit", "Audit log", ScrollText],
] as const;

export default function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const logout = async () => {
    setBusy(true);
    setError("");
    const ok = await fetch("/api/admin/auth/logout", { method: "POST" }).then((r) => r.ok, () => false);
    if (ok) window.location.replace("/admin/login");
    else {
      setError("Log out did not finish. Please try again.");
      setBusy(false);
    }
  };
  return (
    <div className="brand brand-themed sg-app min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="flex flex-col gap-6 bg-navy p-4 text-white lg:sticky lg:top-0 lg:h-dvh lg:p-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin" aria-label="Admin overview"><Logo tone="dark" className="h-12 lg:h-9" /></Link>
          <span className="flex items-center gap-1.5 rounded-full shrink-0 bg-white/10 px-2 py-1 text-xs font-semibold"><ShieldCheck aria-hidden className="size-3.5 text-[#4de3ff]" />Admin</span>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto [scrollbar-width:none] lg:grid">
          {LINKS.map(([href, label, Icon]) => {
            const on = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} aria-current={on ? "page" : undefined} className={cn("flex min-h-9 items-center gap-2.5 rounded-lg px-3 text-sm whitespace-nowrap", on ? "gradient-brand font-semibold" : "text-white/70 hover:bg-white/8 hover:text-white")}><Icon aria-hidden className="size-4" />{label}</Link>;
          })}
        </nav>
        <div className="mt-auto grid gap-2 border-t border-white/12 pt-4 max-lg:grid-cols-[1fr_auto] max-lg:items-center">
          <span className="truncate px-1 text-sm text-white/70">{email}</span>
          <button type="button" disabled={busy} onClick={logout} className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm text-white/80 hover:bg-white/8 hover:text-white disabled:opacity-50"><LogOut aria-hidden className="size-4" />Log out</button>
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        </div>
      </aside>
      <div className="sg-app-main min-w-0">
        <div className="flex justify-end px-5 pt-5 sm:px-8"><ThemeToggle className="!size-9 !rounded-lg !border-hairline !bg-card" /></div>
        <main className="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
