import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { disconnectRemote } from "../src/server/muapi";

// A fake MuAPI: the disconnect call answers `status`; the account list returns `rows`.
function fakeMuapi(status: number, rows: unknown[] | "down") {
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") return new Response(JSON.stringify({ detail: "nope" }), { status });
    if (rows === "down") return new Response("", { status: 500 });
    return new Response(JSON.stringify(rows), { status: 200 });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("disconnecting an account at MuAPI", () => {
  beforeEach(() => {
    vi.stubEnv("MUAPI_API_KEY", "test-key");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("succeeds normally", async () => {
    const fetch = fakeMuapi(200, []);
    await expect(disconnectRemote(7, "ws_a")).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("accepts a refusal when the account is already gone", async () => {
    fakeMuapi(404, [{ id: 8, external_user_id: "ws_a", connected: true }]);
    await expect(disconnectRemote(7, "ws_a")).resolves.toBeUndefined();
  });

  it("accepts a refusal when the account is already disconnected", async () => {
    fakeMuapi(400, [{ id: 7, external_user_id: "ws_a", connected: false }]);
    await expect(disconnectRemote(7, "ws_a")).resolves.toBeUndefined();
  });

  it("keeps the error when the account is still connected", async () => {
    fakeMuapi(500, [{ id: 7, external_user_id: "ws_a", connected: true }]);
    await expect(disconnectRemote(7, "ws_a")).rejects.toThrow("could not complete");
  });

  it("keeps the error when MuAPI cannot be checked", async () => {
    fakeMuapi(500, "down");
    await expect(disconnectRemote(7, "ws_a")).rejects.toThrow("could not complete");
  });
});
