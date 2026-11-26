"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaFacebook, FaInstagram, FaLinkedin, FaPinterest, FaYoutube } from "react-icons/fa";
import { FaThreads, FaXTwitter } from "react-icons/fa6";
import { SiTiktok } from "react-icons/si";
import { FiAlertTriangle, FiCheck, FiEdit2, FiPlus, FiPower, FiRefreshCw, FiX } from "react-icons/fi";
import { announceAccounts, CONNECT_MESSAGES, onAccountsChanged, openConnect } from "@/lib/connect-client";
import { inWorkspace } from "@/lib/workspace-client";
import { askConfirm } from "@/components/ui/confirm";

const PLATFORMS = [
  { key: "facebook", name: "Facebook", Icon: FaFacebook, color: "#1877f2", text: "Pages you manage. Personal profiles and Groups are not possible on any tool." },
  { key: "instagram", name: "Instagram", Icon: FaInstagram, color: "#e1306c", text: "Business or Creator accounts." },
  { key: "youtube", name: "YouTube", Icon: FaYoutube, color: "#ff0000", text: "Videos on your channel. Each post needs a video and a title." },
  { key: "tiktok", name: "TikTok", Icon: SiTiktok, color: "currentColor", text: "Short videos. Each post needs a video." },
  { key: "x_twitter", name: "X", Icon: FaXTwitter, color: "currentColor", text: "Text, photos and video." },
  { key: "linkedin", name: "LinkedIn", Icon: FaLinkedin, color: "#0a66c2", text: "Profiles and pages." },
  { key: "threads", name: "Threads", Icon: FaThreads, color: "currentColor", text: "Text and media." },
  { key: "pinterest", name: "Pinterest", Icon: FaPinterest, color: "#e60023", text: "Pins." },
];
const STATES = { ready: "", setup: "Not set up on the server yet", off: "Not available yet", testing: "Not available yet" };
const REFRESH = 20_000;

const say = (result) => (result === "connected" ? toast.success : toast)(CONNECT_MESSAGES[result] || CONNECT_MESSAGES.failed, { duration: 6000 });
const small = "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
const quiet = `${small} border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500`;

async function json(path, options) {
  const response = await fetch(inWorkspace(path), options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

// What each saved state means to the person.
const STATUS = {
  ACTIVE: { label: "Active", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
  NEEDS_RECONNECT: { label: "Needs reconnecting", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  DISCONNECTED: { label: "Disconnected", dot: "bg-zinc-400", text: "text-zinc-500 dark:text-zinc-400" },
};

function AccountRow({ account, busy, onReconnect, onRenamed, onChanged }) {
  const status = STATUS[account.status] ?? STATUS.NEEDS_RECONNECT;
  const off = account.status === "DISCONNECTED";
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(account.account_name);
  const [working, setWorking] = useState(false);
  const run = async (work) => {
    setWorking(true);
    try {
      await work();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setWorking(false);
    }
  };
  const save = () =>
    run(async () => {
      const body = JSON.stringify({ accountName: name.trim() });
      onRenamed(await json(`/accounts/${account.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body }));
      setEditing(false);
    });
  const disconnect = async () => {
    const ok = await askConfirm({
      title: `Disconnect ${account.account_name}?`,
      body: "SocialGem stops posting to it, and scheduled posts for it will not go out. It stays in this list, and you can turn it back on at any time.",
      confirmLabel: "Disconnect",
      tone: "danger",
    });
    if (!ok) return;
    run(async () => {
      await json(`/accounts/${account.id}`, { method: "DELETE" });
      onChanged({ ...account, status: "DISCONNECTED", connected: false });
      announceAccounts();
      toast.success(`${account.account_name} is disconnected.`);
    });
  };
  const turnOn = () =>
    run(async () => {
      const next = await json(`/accounts/${account.id}/enable`, { method: "POST" });
      onChanged(next);
      announceAccounts();
      if (next.connected) toast.success(`${account.account_name} is back on.`);
      else toast(`${account.account_name} is back on, but needs reconnecting first.`, { duration: 6000 });
    });

  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/50 ${off ? "opacity-75" : ""}`}>
      <span aria-hidden className={`size-2 rounded-full ${status.dot}`} />
      {editing ? (
        <input
          autoFocus
          aria-label="Account name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className="min-h-9 min-w-0 flex-1 rounded border border-[#6d28d9] bg-white px-2 text-sm dark:bg-zinc-950"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {account.account_name}
          <span className={`ml-2 text-xs font-medium ${status.text}`}>{status.label}</span>
        </span>
      )}
      {editing ? (
        <>
          <button type="button" className={quiet} disabled={working || !name.trim()} onClick={save}><FiCheck /> Save</button>
          <button type="button" className={quiet} disabled={working} onClick={() => setEditing(false)}><FiX /> Cancel</button>
        </>
      ) : (
        <>
          {off ? (
            <button type="button" className={quiet} disabled={working} onClick={turnOn}><FiPower /> Turn back on</button>
          ) : (
            <>
              {account.status === "NEEDS_RECONNECT" && <button type="button" className={quiet} disabled={busy} onClick={onReconnect}><FiRefreshCw /> Reconnect</button>}
              <button type="button" className={quiet} disabled={working} aria-label={`Rename ${account.account_name}`} title="Rename" onClick={() => { setName(account.account_name); setEditing(true); }}><FiEdit2 /></button>
              <button type="button" className={quiet} disabled={working} onClick={disconnect}><FiPower /> Disconnect</button>
            </>
          )}
        </>
      )}
    </li>
  );
}

export default function ChannelsPage() {
  const [accounts, setAccounts] = useState(null);
  const [states, setStates] = useState({});
  const [problem, setProblem] = useState("");
  const [connecting, setConnecting] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const abort = useRef(null);

  const load = useCallback(async (fresh = false) => {
    try {
      setAccounts(await json(`/accounts?all=1${fresh ? "&fresh=1" : ""}`));
      setProblem("");
    } catch (error) {
      setProblem(error.message);
    }
  }, []);

  useEffect(() => {
    let live = true;
    const first = setTimeout(() => {
      load(true);
      json("/accounts/platforms").then((data) => live && setStates(data)).catch(() => {});
      const result = new URLSearchParams(window.location.search).get("connect");
      if (result) {
        say(result);
        window.history.replaceState(null, "", "/integrations");
      }
    });
    // Live: every 20 seconds while visible, when the tab is opened again, and when another tab changes something.
    const visible = () => document.visibilityState === "visible" && load(true);
    const timer = setInterval(visible, REFRESH);
    document.addEventListener("visibilitychange", visible);
    const stop = onAccountsChanged(() => load());
    return () => {
      live = false;
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      stop();
      abort.current?.abort();
    };
  }, [load]);

  const connect = async (platform) => {
    abort.current = new AbortController();
    setConnecting(platform);
    try {
      const result = await openConnect(platform, abort.current.signal);
      if (result) say(result);
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setConnecting("");
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 text-slate-900 sm:px-6 dark:text-white">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Channels</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Connections for this workspace only. The list updates by itself.</p>
        </div>
        <button
          type="button"
          className={quiet}
          disabled={refreshing}
          onClick={async () => {
            setRefreshing(true);
            await load(true);
            setRefreshing(false);
          }}
        >
          <FiRefreshCw className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} /> Refresh
        </button>
      </header>

      {problem && (
        <p role="alert" className="mt-6 flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <FiAlertTriangle className="shrink-0 text-amber-600" /> {problem}
        </p>
      )}

      <ul className="mt-6 grid gap-4">
        {PLATFORMS.map(({ key, name, Icon, color, text }) => {
          const mine = (accounts ?? []).filter((a) => a.platform_name === key);
          const state = states[key];
          const waiting = connecting === key;
          return (
            <li key={key} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-[#2a2746] dark:bg-[#15132b]">
              <div className="flex flex-wrap items-center gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-zinc-200 bg-zinc-100 text-xl dark:border-zinc-800 dark:bg-zinc-900" style={{ color }}><Icon aria-hidden /></span>
                <div className="min-w-40 flex-1">
                  <h2 className="font-bold">{name}</h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{text}</p>
                </div>
                {waiting ? (
                  <span role="status" className="flex items-center gap-3 text-sm">
                    <FiRefreshCw className="animate-spin motion-reduce:animate-none" /> Waiting for {name}
                    <button type="button" className={quiet} onClick={() => { abort.current?.abort(); setConnecting(""); toast("Stopped waiting. You can close the other window."); }}>Cancel</button>
                  </span>
                ) : state === "ready" ? (
                  <button type="button" className={`${small} bg-[#6d28d9] text-white hover:bg-[#5b1fc0]`} disabled={Boolean(connecting)} onClick={() => connect(key)}>
                    <FiPlus /> {mine.length ? "Add another" : "Connect"}
                  </button>
                ) : (
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{STATES[state] ?? ""}</span>
                )}
              </div>
              {accounts === null && state === "ready" && <div className="mt-4 h-11 animate-pulse rounded-lg bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-900" />}
              {mine.length > 0 && (
                <ul className="mt-4 grid gap-2">
                  {mine.map((account) => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      busy={Boolean(connecting) || state !== "ready"}
                      onReconnect={() => connect(key)}
                      onRenamed={(next) => setAccounts((list) => list.map((a) => (a.id === next.id ? next : a)))}
                      onChanged={(next) => setAccounts((list) => list.map((a) => (a.id === next.id ? next : a)))}
                    />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
