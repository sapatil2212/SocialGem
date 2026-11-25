"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Dialog, DropdownMenu } from "radix-ui";
import { MotionConfig, motion } from "motion/react";
import { Bot, CalendarDays, ChartNoAxesColumn, ChevronsUpDown, CircleHelp, CreditCard, Image as ImageIcon, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, Share2, Sparkles, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import WorkspaceSwitcher from "@/components/layout/WorkspaceSwitcher";
import Logo, { Mark } from "@/components/site/Logo";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    name: "Workspace",
    items: [
      { name: "Calendar", path: "/app", Icon: CalendarDays, hint: "Plan and schedule your posts" },
      { name: "Analytics", path: "/analytics", Icon: ChartNoAxesColumn, hint: "See how posts are doing" },
      { name: "AI agent", path: "/agents", Icon: Bot, hint: "Draft ideas and captions" },
    ],
  },
  {
    name: "Library",
    items: [
      { name: "Channels", path: "/integrations", Icon: Share2, hint: "Connect your social accounts" },
      { name: "Media", path: "/media", Icon: ImageIcon, hint: "Photos and videos you reuse" },
    ],
  },
  {
    name: "Account",
    items: [
      { name: "Account settings", path: "/account", Icon: Settings, hint: "Your profile and ways to log in" },
      { name: "Pricing", path: "/pricing", Icon: CreditCard, hint: "Plans and limits" },
      { name: "Help", path: "/help", Icon: CircleHelp, hint: "Answers to common questions" },
    ],
  },
];
const ALL = GROUPS.flatMap((g) => g.items);
const isActive = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`) || (path === "/media" && pathname.startsWith("/gallery"));

// The sidebar choice lives in this browser only.
const KEY = "sg-sidebar";
const subscribe = (notify) => {
  window.addEventListener("storage", notify);
  window.addEventListener(KEY, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(KEY, notify);
  };
};
function readCollapsed() {
  try {
    return localStorage.getItem(KEY) === "closed";
  } catch {
    return false;
  }
}
function writeCollapsed(value) {
  try {
    localStorage.setItem(KEY, value ? "closed" : "open");
  } catch {}
  window.dispatchEvent(new Event(KEY));
}

const iconButton = "grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-hairline bg-card text-muted-ink transition-colors hover:border-brand/40 hover:text-foreground";

function Avatar({ user, className }) {
  if (user?.image) return <img src={user.image} alt="" referrerPolicy="no-referrer" className={cn("size-9 rounded-xl object-cover", className)} />;
  return <span aria-hidden className={cn("gradient-brand grid size-9 shrink-0 place-items-center rounded-xl text-sm font-semibold", className)}>{(user?.name || user?.email || "U").charAt(0).toUpperCase()}</span>;
}

function UserMenu({ user, compact }) {
  const item = "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-tint";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger aria-label="Your account" className={cn("flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-hairline bg-background p-2 text-left transition-colors hover:border-brand/40", compact && "justify-center border-transparent bg-transparent p-0")}>
        <Avatar user={user} />
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-sm font-semibold">{user?.name || "Your account"}</b>
              <span className="block truncate text-xs text-muted-ink">{user?.email}</span>
            </span>
            <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-ink" />
          </>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side="top" align="start" sideOffset={8} className="brand brand-themed z-[60] w-60 rounded-2xl border border-hairline !bg-card p-1.5 shadow-xl">
          <div className="border-b border-hairline px-3 pt-1.5 pb-2.5">
            <b className="block truncate text-sm font-semibold">{user?.name || "Your account"}</b>
            <span className="block truncate text-xs text-muted-ink">{user?.email}</span>
          </div>
          <DropdownMenu.Item asChild className={cn(item, "mt-1.5")}><Link href="/account"><Settings className="size-4" /> Account settings</Link></DropdownMenu.Item>
          <DropdownMenu.Item asChild className={item}><Link href="/integrations"><Share2 className="size-4" /> Connected channels</Link></DropdownMenu.Item>
          <DropdownMenu.Item asChild className={item}><Link href="/help"><CircleHelp className="size-4" /> Help centre</Link></DropdownMenu.Item>
          <DropdownMenu.Item className={cn(item, "text-destructive")} onSelect={() => signOut({ callbackUrl: "/login" })}><LogOut className="size-4" /> Log out</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function Nav({ pathname, compact, id, onGo }) {
  return (
    <nav aria-label="Dashboard" className="grid gap-5">
      {GROUPS.map((group) => (
        <div key={group.name} className="grid gap-0.5">
          <span className={cn("px-3 pb-1 text-xs font-medium text-muted-ink", compact && "sr-only")}>{group.name}</span>
          {group.items.map(({ name, path, Icon }) => {
            const on = isActive(pathname, path);
            return (
              <Link key={path} href={path} onClick={onGo} title={compact ? name : undefined} aria-label={name} aria-current={on ? "page" : undefined} className={cn("group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] transition-colors", compact && "justify-center px-0", on ? "font-semibold text-white" : "text-muted-ink hover:bg-tint hover:text-foreground")}>
                {on && <motion.span layoutId={`${id}-nav`} className="gradient-brand absolute inset-0 rounded-xl" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                <Icon aria-hidden className="relative size-[1.15rem] shrink-0 transition-transform group-hover:scale-110 motion-reduce:transition-none" />
                {!compact && <span className="relative">{name}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Palette({ open, onOpenChange, onCreate, onAi }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [at, setAt] = useState(0);
  const list = useRef(null);
  const actions = [
    { name: "Create post", hint: "Open the composer", Icon: Plus, run: onCreate },
    { name: "Write with AI", hint: "Start from an idea", Icon: Sparkles, run: onAi },
    ...ALL.map((i) => ({ ...i, run: () => router.push(i.path) })),
  ];
  const found = actions.filter((a) => `${a.name} ${a.hint}`.toLowerCase().includes(query.trim().toLowerCase()));
  const change = (next) => {
    setQuery("");
    setAt(0);
    onOpenChange(next);
  };
  const run = (action) => {
    change(false);
    action?.run();
  };
  const move = (to) => {
    setAt(to);
    list.current?.children[to]?.scrollIntoView({ block: "nearest" });
  };
  return (
    <Dialog.Root open={open} onOpenChange={change}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-[#080718]/55 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="brand brand-themed fixed top-[14vh] left-1/2 z-[71] w-[min(560px,92vw)] -translate-x-1/2 overflow-hidden rounded-2xl border border-hairline !bg-card shadow-2xl">
          <Dialog.Title className="sr-only">Search and commands</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-hairline px-4">
            <Search aria-hidden className="size-5 text-muted-ink" />
            <input
              role="combobox"
              aria-expanded="true"
              aria-controls="sg-palette"
              aria-activedescendant={found[at] ? `sg-cmd-${at}` : undefined}
              aria-label="Search pages and actions"
              value={query}
              placeholder="Search pages and actions"
              className="min-h-14 flex-1 bg-transparent outline-none placeholder:text-muted-ink"
              onChange={(e) => {
                setQuery(e.target.value);
                setAt(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  if (found.length) move((at + (e.key === "ArrowDown" ? 1 : -1) + found.length) % found.length);
                } else if (e.key === "Enter" && found[at]) {
                  e.preventDefault();
                  run(found[at]);
                }
              }}
            />
          </div>
          <div id="sg-palette" role="listbox" aria-label="Results" ref={list} className="max-h-80 overflow-y-auto p-2">
            {found.map((action, i) => (
              <div key={action.name} id={`sg-cmd-${i}`} role="option" aria-selected={i === at} onPointerMove={() => setAt(i)} onClick={() => run(action)} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3", i === at && "bg-tint-strong")}>
                <action.Icon aria-hidden className="size-4 text-brand-ink" />
                <span className="text-sm font-medium">{action.name}</span>
                <span className="ml-auto text-xs text-muted-ink">{action.hint}</span>
              </div>
            ))}
            {!found.length && <p className="px-3 py-8 text-center text-sm text-muted-ink">Nothing matches that search.</p>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const page = ALL.find((i) => isActive(pathname, i.path)) ?? ALL[0];

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const compose = (withAi) => {
    if (pathname === "/app") window.dispatchEvent(new CustomEvent("open-composer", { detail: { withAi } }));
    else router.push(withAi ? "/app?ai=true" : "/app?compose=true");
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="brand brand-themed sg-app fixed inset-0 flex overflow-hidden">
        <a href="#workspace" className="absolute -left-[999px] z-[80] rounded-lg bg-card px-4 py-2 focus:top-3 focus:left-3">Skip to content</a>
        <aside className={cn("hidden shrink-0 flex-col border-r border-hairline bg-card transition-[width] duration-300 motion-reduce:transition-none lg:flex", collapsed ? "w-[84px]" : "w-[264px]")}>
          <div className={cn("flex h-[76px] shrink-0 items-center px-4", collapsed ? "justify-center" : "justify-between")}>
            {collapsed ? <Link href="/app" aria-label="SocialGem dashboard"><Mark className="size-11" /></Link> : <Link href="/app" aria-label="SocialGem dashboard"><Logo tone="auto" className="h-12" /></Link>}
            {!collapsed && <button type="button" onClick={() => writeCollapsed(true)} aria-label="Collapse sidebar" className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted-ink hover:bg-tint"><PanelLeftClose className="size-[1.1rem]" /></button>}
          </div>
          <div className={cn("flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4", collapsed && "px-3")}>
            {!collapsed && <WorkspaceSwitcher />}
            <button type="button" onClick={() => compose(false)} aria-label="Create post" className="shimmer flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-white hover:bg-brand-hover"><Plus aria-hidden className="size-5" />{!collapsed && "Create post"}</button>
            <Nav pathname={pathname} compact={collapsed} id="side" />
          </div>
          <div className={cn("grid shrink-0 gap-3 border-t border-hairline p-4", collapsed && "justify-items-center px-3")}>
            {collapsed && <button type="button" onClick={() => writeCollapsed(false)} aria-label="Expand sidebar" className="grid size-10 cursor-pointer place-items-center rounded-lg text-muted-ink hover:bg-tint"><PanelLeftOpen className="size-[1.1rem]" /></button>}
            <UserMenu user={session?.user} compact={collapsed} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[68px] shrink-0 items-center gap-2.5 border-b border-hairline bg-card/80 px-4 backdrop-blur-xl sm:px-6 lg:h-[76px]">
            <button type="button" onClick={() => setDrawer(true)} aria-label="Open navigation" className={cn(iconButton, "lg:hidden")}><Menu className="size-5" /></button>
            <div className="mr-auto min-w-0">
              <h1 className="truncate text-xl !leading-tight">{page.name}</h1>
              <p className="hidden truncate text-sm text-muted-ink sm:block">{page.hint}</p>
            </div>
            <button type="button" onClick={() => setPalette(true)} aria-label="Search" aria-keyshortcuts="Control+K Meta+K" className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl border border-hairline bg-background px-3 text-sm text-muted-ink hover:border-brand/40 xl:w-64">
              <Search aria-hidden className="size-4" /><span className="hidden xl:inline">Search</span><kbd className="ml-auto hidden rounded-md border border-hairline px-1.5 font-sans text-xs xl:inline">Ctrl K</kbd>
            </button>
            <ThemeToggle className="!size-10 !rounded-xl !border-hairline !bg-card" />
            <button type="button" onClick={() => compose(true)} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-brand/30 bg-tint px-3.5 text-sm font-semibold text-brand-ink hover:border-brand"><Sparkles aria-hidden className="size-4" /><span className="max-sm:sr-only">Write with AI</span></button>
          </header>
          <main id="workspace" tabIndex={-1} className="sg-app-main min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-20 outline-none lg:pb-0">{children}</main>
        </div>

        <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-hairline bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
          {[ALL[0], ALL[1]].map((i) => <Tab key={i.path} item={i} on={isActive(pathname, i.path)} />)}
          <button type="button" onClick={() => compose(false)} aria-label="Create post" className="grid min-h-16 cursor-pointer place-items-center"><span className="gradient-brand grid size-12 place-items-center rounded-2xl"><Plus className="size-6" /></span></button>
          {[ALL[3], ALL[4]].map((i) => <Tab key={i.path} item={i} on={isActive(pathname, i.path)} />)}
        </nav>

        <Dialog.Root open={drawer} onOpenChange={setDrawer}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-[#080718]/55 backdrop-blur-sm lg:hidden" />
            <Dialog.Content aria-describedby={undefined} className="brand brand-themed fixed inset-y-0 left-0 z-50 flex w-[min(304px,86vw)] flex-col gap-5 overflow-y-auto border-r border-hairline !bg-card p-4 data-[state=open]:animate-in data-[state=open]:slide-in-from-left motion-reduce:animate-none lg:hidden">
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <div className="flex items-center justify-between"><Logo tone="auto" className="h-12" /><Dialog.Close aria-label="Close navigation" className="grid size-11 cursor-pointer place-items-center rounded-lg"><X className="size-5" /></Dialog.Close></div>
              <WorkspaceSwitcher />
              <Nav pathname={pathname} id="drawer" onGo={() => setDrawer(false)} />
              <div className="mt-auto"><UserMenu user={session?.user} /></div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <Palette open={palette} onOpenChange={setPalette} onCreate={() => compose(false)} onAi={() => compose(true)} />
      </div>
    </MotionConfig>
  );
}

function Tab({ item: { name, path, Icon }, on }) {
  return (
    <Link href={path} aria-current={on ? "page" : undefined} className={cn("grid min-h-16 place-content-center justify-items-center gap-1 text-xs", on ? "font-semibold text-brand-ink" : "text-muted-ink")}>
      <Icon aria-hidden className="size-5" />{name}
    </Link>
  );
}
