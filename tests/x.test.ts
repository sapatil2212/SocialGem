import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Real MySQL, on this computer only, with a stand-in for X. Anything else is refused.
const url = process.env.TEST_DATABASE_URL ?? "";
const local = (() => {
  try {
    const u = new URL(url);
    return ["127.0.0.1", "localhost"].includes(u.hostname) && u.pathname.endsWith("_test");
  } catch {
    return false;
  }
})();

describe.skipIf(!local)("X connections (local MySQL, stand-in X)", async () => {
  if (!local) return;
  process.env.DATABASE_URL = url;
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  process.env.NEXTAUTH_SECRET = "test-secret-that-is-long-enough";
  process.env.X_CLIENT_ID = "client-123";
  process.env.X_CLIENT_SECRET = "secret-456";
  process.env.X_CALLBACK_URL = "http://localhost:3000/api/social/x/callback";
  process.env.MUAPI_API_KEY = "fake-test-key";
  process.env.MUAPI_BASE_URL = "http://127.0.0.1:9";
  const db = new PrismaClient({ datasourceUrl: url });
  const { createWorkspace, membership } = await import("../src/server/workspaces");
  const { attemptResult, finishXConnect, startConnect, syncAccounts, xAccessToken, sendToX } = await import("../src/server/accounts");
  const { platformStates } = await import("../src/server/muapi");
  const { openTokens } = await import("../src/server/tokens");

  type W = { id: string; userId: string };
  let a: W, b: W;
  let calls: { url: string; init?: RequestInit }[];
  let xUser = { id: "777", username: "ashabakes", name: "Asha" };
  let tokenCount = 0;
  let refreshWorks = true;

  async function seed(name: string): Promise<W> {
    const user = await db.user.create({ data: { email: `${name}@example.com` } });
    const w = await createWorkspace(user.id, { name: `Brand ${name}`, timezone: "Asia/Kolkata" });
    return { id: w.id, userId: user.id };
  }

  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  beforeEach(async () => {
    for (const t of ["AiUsage", "AiJob", "ContentIdea", "ContentPlan", "ContentResearch", "BrandProfile", "PublishAttempt", "PostTarget", "Post", "PostTag", "MediaAsset", "SocialAccount", "ConnectAttempt", "LedgerEntry", "Invoice", "Payment", "Subscription", "Notification", "WorkspaceMember", "Workspace", "BillingAccount", "User"]) {
      await db.$executeRawUnsafe("DELETE FROM " + t);
    }
    a = await seed("a");
    b = await seed("b");
    calls = [];
    tokenCount = 0;
    refreshWorks = true;
    xUser = { id: "777", username: "ashabakes", name: "Asha" };
    vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      const u = new URL(String(input));
      if (u.hostname === "127.0.0.1") return reply(200, []); // MuAPI: holds no accounts
      if (u.pathname === "/2/oauth2/token") {
        const form = new URLSearchParams(String(init?.body));
        if (form.get("grant_type") === "refresh_token" && !refreshWorks) return reply(400, { error: "invalid_grant", error_description: "Value passed for the token was invalid." });
        tokenCount++;
        return reply(200, { token_type: "bearer", expires_in: 7200, access_token: `access-${tokenCount}`, refresh_token: `refresh-${tokenCount}` });
      }
      if (u.pathname === "/2/users/me") return reply(200, { data: { ...xUser, profile_image_url: "https://pbs.twimg.com/a.jpg" } });
      if (u.pathname === "/2/tweets") return reply(201, { data: { id: "1900", text: JSON.parse(String(init?.body)).text } });
      return reply(404, {});
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  beforeAll(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterAll(() => db.$disconnect());

  async function begin(w: W) {
    const started = await startConnect((await membership(w.userId, w.id))!, w.userId, "x_twitter");
    const link = new URL(started.url);
    return { ...started, link, state: link.searchParams.get("state")! };
  }

  it("is offered only when its own keys are set", () => {
    expect(platformStates().x_twitter).toBe("ready");
    const saved = process.env.X_CLIENT_ID;
    process.env.X_CLIENT_ID = "YOUR_CLIENT_ID";
    expect(platformStates().x_twitter).toBe("setup");
    process.env.X_CLIENT_ID = saved;
  });

  it("sends people to X with PKCE and a single-use state", async () => {
    const { link, state } = await begin(a);
    expect(link.origin + link.pathname).toBe("https://x.com/i/oauth2/authorize");
    expect(link.searchParams.get("code_challenge_method")).toBe("S256");
    expect(link.searchParams.get("redirect_uri")).toBe(process.env.X_CALLBACK_URL);
    expect(link.searchParams.get("scope")).toContain("offline.access");
    expect(state).toMatch(/^[\w-]{32}$/);
    // MuAPI is not involved at all.
    expect(calls.filter((c) => c.url.includes("127.0.0.1"))).toHaveLength(0);
  });

  it("connects only for the person who started, once, and stores the tokens encrypted", async () => {
    const s = await begin(a);
    expect((await finishXConnect(b.userId, s.state, "code-1")).result).toBe("expired");
    expect((await finishXConnect(a.userId, s.state, "code-1")).result).toBe("connected");
    expect((await finishXConnect(a.userId, s.state, "code-1")).result).toBe("expired");
    expect(await attemptResult(a.id, a.userId, s.attempt)).toBe("connected");

    const exchange = new URLSearchParams(String(calls.find((c) => c.url.endsWith("/2/oauth2/token"))!.init!.body));
    expect(exchange.get("code_verifier")).toMatch(/^[\w-]{43,128}$/);
    expect((calls.find((c) => c.url.endsWith("/2/oauth2/token"))!.init!.headers as Record<string, string>).Authorization).toMatch(/^Basic /);

    const account = await db.socialAccount.findFirstOrThrow({ where: { workspaceId: a.id, platform: "X" } });
    expect(account).toMatchObject({ name: "@ashabakes", platformUserId: "777", claimKey: "x:777", status: "ACTIVE", muapiAccountId: null });
    expect(account.tokenCipher).not.toContain("access-1");
    expect(openTokens<{ access: string; refresh: string }>(account.tokenCipher!)).toMatchObject({ access: "access-1", refresh: "refresh-1" });
    expect((await db.connectAttempt.findUniqueOrThrow({ where: { id: s.attempt } })).codeVerifier).toBeNull();
  });

  it("records a refusal on X as nothing connected", async () => {
    const s = await begin(a);
    expect((await finishXConnect(a.userId, s.state, null)).result).toBe("none");
    expect(await db.socialAccount.count({ where: { platform: "X" } })).toBe(0);
  });

  it("will not take an X account another workspace already has", async () => {
    await finishXConnect(a.userId, (await begin(a)).state, "code-1");
    expect((await finishXConnect(b.userId, (await begin(b)).state, "code-2")).result).toBe("taken");
    // Reconnecting in the same workspace updates it in place.
    expect((await finishXConnect(a.userId, (await begin(a)).state, "code-3")).result).toBe("connected");
    expect(await db.socialAccount.count({ where: { platform: "X" } })).toBe(1);
  });

  it("is never marked for reconnecting by the MuAPI check", async () => {
    await finishXConnect(a.userId, (await begin(a)).state, "code-1");
    await db.socialAccount.updateMany({ data: { lastCheckedAt: null } });
    await syncAccounts((await membership(a.userId, a.id))!, 0);
    expect((await db.socialAccount.findFirstOrThrow({ where: { platform: "X" } })).status).toBe("ACTIVE");
  });

  it("refreshes an expiring token and keeps the new refresh token", async () => {
    await finishXConnect(a.userId, (await begin(a)).state, "code-1");
    const account = await db.socialAccount.findFirstOrThrow({ where: { platform: "X" } });
    expect(await xAccessToken(a.id, account.id)).toBe("access-1");
    await db.socialAccount.update({ where: { id: account.id }, data: { tokenCipher: (await import("../src/server/tokens")).sealTokens({ access: "access-1", refresh: "refresh-1", expiresAt: Date.now() + 60_000 }) } });
    expect(await xAccessToken(a.id, account.id)).toBe("access-2");
    const stored = openTokens<{ refresh: string }>((await db.socialAccount.findUniqueOrThrow({ where: { id: account.id } })).tokenCipher!);
    expect(stored.refresh).toBe("refresh-2");
    // Another workspace cannot use it.
    await expect(xAccessToken(b.id, account.id)).rejects.toThrow();
  });

  it("asks for a reconnect when X has signed the account out", async () => {
    await finishXConnect(a.userId, (await begin(a)).state, "code-1");
    const account = await db.socialAccount.findFirstOrThrow({ where: { platform: "X" } });
    await db.socialAccount.update({ where: { id: account.id }, data: { tokenCipher: (await import("../src/server/tokens")).sealTokens({ access: "old", refresh: "dead", expiresAt: 0 }) } });
    refreshWorks = false;
    await expect(xAccessToken(a.id, account.id)).rejects.toMatchObject({ code: "X_SIGNED_OUT" });
    expect((await db.socialAccount.findUniqueOrThrow({ where: { id: account.id } })).status).toBe("NEEDS_RECONNECT");
  });

  it("sends a post as the signed-in user, within X's limit", async () => {
    await finishXConnect(a.userId, (await begin(a)).state, "code-1");
    const account = await db.socialAccount.findFirstOrThrow({ where: { platform: "X" } });
    await expect(sendToX(a.id, account.id, "x".repeat(281))).rejects.toMatchObject({ code: "TOO_LONG" });
    const sent = await sendToX(a.id, account.id, "Fresh batch at 5 pm");
    expect(sent).toEqual({ id: "1900", url: "https://x.com/i/web/status/1900" });
    const post = calls.find((c) => c.url.endsWith("/2/tweets"))!;
    expect((post.init!.headers as Record<string, string>).Authorization).toBe("Bearer access-1");
  });
});
