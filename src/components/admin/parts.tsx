import type { ReactNode } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export const when = (date: Date) => date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export function Heading({ title, text }: { title: string; text: string }) {
  return <header className="mb-5"><h1 className="!text-2xl">{title}</h1><p className="mt-2 text-muted-ink">{text}</p></header>;
}

export function Badge({ tone, children }: { tone: "good" | "bad" | "warn" | "plain"; children: ReactNode }) {
  const tones = { good: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300", bad: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300", warn: "bg-cream text-warning dark:bg-amber-400/15", plain: "bg-tint-strong text-brand-ink" };
  return <span className={`inline-block rounded-lg px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

export function SearchBar({ q, label }: { q: string; label: string }) {
  return (
    <form role="search" className="mb-4 flex max-w-md gap-2">
      <Input name="q" defaultValue={q} aria-label={label} placeholder={label} maxLength={100} />
      <Button type="submit" variant="outline" aria-label="Search"><Search /></Button>
    </form>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode[]; empty: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-hairline bg-card">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead><tr className="border-b border-hairline bg-tint">{head.map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr></thead>
        <tbody className="[&_td]:px-4 [&_td]:py-2.5 [&_tr+tr]:border-t [&_tr]:border-hairline">{children.length ? children : <tr><td colSpan={head.length} className="!py-10 text-center text-muted-ink">{empty}</td></tr>}</tbody>
      </table>
    </div>
  );
}

export function Pager({ path, page, pages, q = "" }: { path: string; page: number; pages: number; q?: string }) {
  if (pages <= 1) return null;
  const href = (n: number) => `${path}?${new URLSearchParams({ ...(q && { q }), page: String(n) })}`;
  return (
    <nav aria-label="Pages" className="mt-5 flex items-center justify-between text-sm text-muted-ink">
      <span>Page {page} of {pages}</span>
      <span className="flex gap-2">
        {page > 1 && <Button asChild variant="outline"><Link href={href(page - 1)}>Previous</Link></Button>}
        {page < pages && <Button asChild variant="outline"><Link href={href(page + 1)}>Next</Link></Button>}
      </span>
    </nav>
  );
}
