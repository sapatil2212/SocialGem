import { inWorkspace } from "./workspace-client";

export const ACCOUNTS_CHANNEL = "sg-accounts";

export const CONNECT_MESSAGES = {
  connected: "Account connected.",
  taken: "That account is already connected in another workspace. Disconnect it there first.",
  none: "No new account was connected. If you chose a Page you had already connected, it stays as it was.",
  expired: "That connection link has expired. Please try again.",
  failed: "The social service did not respond. Please try again.",
};

/** Tells every open tab that the list of accounts changed. */
export function announceAccounts() {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(ACCOUNTS_CHANNEL);
  channel.postMessage("changed");
  channel.close();
}

export function onAccountsChanged(callback) {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const channel = new BroadcastChannel(ACCOUNTS_CHANNEL);
  channel.onmessage = callback;
  return () => channel.close();
}

/**
 * Opens the platform's consent screen and waits for the outcome.
 * Must be called straight from a click, or the browser blocks the window.
 * The window's "closed" flag is not trusted: some platforms detach it.
 */
export async function openConnect(platform, signal) {
  const popup = window.open("", "_blank", "popup,width=600,height=760");
  let data;
  try {
    const response = await fetch(inWorkspace("/accounts/connect"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    data = await response.json();
    if (!response.ok) throw new Error(data.error);
  } catch (error) {
    popup?.close();
    throw new Error(error.message || "We could not start the connection.");
  }

  if (!popup) {
    window.location.assign(data.url);
    return new Promise(() => {});
  }
  // So the platform's page cannot redirect ours. It also means we cannot close it: the last page closes itself.
  popup.opener = null;
  popup.location.replace(data.url);

  const until = Date.now() + 15 * 60_000;
  while (Date.now() < until) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (signal?.aborted) return null;
    const reply = await fetch(inWorkspace(`/accounts/connect/${data.attempt}`)).catch(() => null);
    if (!reply) continue;
    if (reply.status === 401 || reply.status === 404) return "expired";
    const { result } = await reply.json().catch(() => ({}));
    if (result && result !== "waiting") {
      if (result === "connected") announceAccounts();
      return result;
    }
  }
  return "expired";
}
