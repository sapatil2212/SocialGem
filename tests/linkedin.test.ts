import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Real MySQL, on this computer only, with a stand-in for LinkedIn. Anything else is refused.
const url = process.env.TEST_DATABASE_URL ?? "";
const local = (() => {
  try {
    const u = new URL(url);
    return ["127.0.0.1", "localhost"].includes(u.hostname) && u.pathname.endsWith("_test");
  } catch {
    return false;
  }
})();

describe.skipIf(!local)("LinkedIn connections (local MySQL, stand-in LinkedIn)", async () => {
  if (!local) return;
  process.env.DATABASE_URL = url;
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  process.env.NEXTAUTH_SECRET = "test-secret-that-is-long-enough";
  process.env.LINKEDIN_CLIENT_ID = "li-client";
  process.env.LINKEDIN_CLIENT_SECRET = "li-secret";
  process.env.LINKEDIN_CALLBACK_URL = "http://localhost:3000/api/social/linkedin/callback";
  process.env.MUAPI_API_KEY = "fake-test-key";
  process.env.MUAPI_BASE_URL = "http://127.0.0.1:9";
  const db = new PrismaClient({ datasourceUrl: url });
  const { createWorkspace, membership } = await import("../src/server/workspaces");
  const { finishDirectConnect, startConnect, syncAccounts, directAccessToken, sendToLinkedIn } = await import("../src/server/accounts");
  const { platformStates } = await import("../src/server/muapi");
  const { openTokens, sealTokens } = await import("../src/server/tokens");

  type W = { id: string; userId: string };
  let a: W, b: W;
  let calls: { url: string; init?: RequestInit }[];
  // API versions LinkedIn says are not active (retired, or not released yet).
  const inactive = new Set<string>();
  const { versionsToTry, resetLinkedInVersion } = await import("../src/server/linkedin");

  async function seed(name: string): Promise<W> {
    const user = await db.user.create({ data: { email: `${name}@example.com` } });
    const w = await createWorkspace(user.id, { name: `Brand ${name}`, timezone: "Asia/Kolkata" });
    return { id: w.id, userId: user.id };
  }
  const reply = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

  beforeEach(async () => {
    for (const t of ["AiUsage", "AiJob", "ContentIdea", "ContentPlan", "ContentResearch", "BrandProfile", "PublishAttempt", "PostTarget", "Post", "PostTag", "MediaAsset", "SocialAccount", "ConnectAttempt", "LedgerEntry", "Invoice", "Payment", "Subscription", "Notification", "WorkspaceMember", "Workspace", "BillingAccount", "User"]) {
      await db.$executeRawUnsafe("DELETE FROM " + t);
    }
    a = await seed("a");
    b = await seed("b");
    calls = [];
    inactive.clear();
    resetLinkedInVersion();
    vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      const u = new URL(String(input));
      if (u.hostname === "127.0.0.1") return reply(200, []); // MuAPI: holds no accounts
      if (u.pathname === "/oauth/v2/accessToken") return reply(200, { access_token: "li-access", expires_in: 5_184_000, scope: "openid,profile,w_member_social" });
      if (u.pathname === "/v2/userinfo") return reply(200, { sub: "abc123", name: "Asha Patil", picture: "https://media.licdn.com/a.jpg" });
      if (u.pathname === "/rest/posts") {
        const version = (init?.headers as Record<string, string>)["LinkedIn-Version"];
        if (inactive.has(version)) return reply(426, { message: `Requested version ${version}01 is not active` });
        return reply(201, {}, { "x-restli-id": "urn:li:share:999" });
      }
      return reply(404, {});
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  beforeAll(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterAll(() => db.$disconnect());

  async function begin(w: W) {
    const started = await startConnect((await membership(w.userId, w.id))!, w.userId, "linkedin");
    const link = new URL(started.url);
    return { ...started, link, state: link.searchParams.get("state")! };
  }

  it("is offered only when its own keys are set", () => {
    expect(platformStates().linkedin).toBe("ready");
    const saved = process.env.LINKEDIN_CLIENT_SECRET;
    process.env.LINKEDIN_CLIENT_SECRET = "YOUR_CLIENT_SECRET";
    expect(platformStates().linkedin).toBe("setup");
    process.env.LINKEDIN_CLIENT_SECRET = saved;
  });

  it("asks LinkedIn only for sign-in and posting to the member's profile", async () => {
    const { link, state } = await begin(a);
    expect(link.origin + link.pathname).toBe("https://www.linkedin.com/oauth/v2/authorization");
    expect(link.searchParams.get("scope")).toBe("openid profile w_member_social");
    expect(link.searchParams.get("redirect_uri")).toBe(process.env.LINKEDIN_CALLBACK_URL);
    expect(state).toMatch(/^[\w-]{32}$/);
  });

  it("connects once, for the person who started, and keeps the token encrypted", async () => {
    const s = await begin(a);
    expect((await finishDirectConnect("linkedin", b.userId, s.state, "code")).result).toBe("expired");
    // A LinkedIn state cannot finish an X connection, or the other way round.
    expect((await finishDirectConnect("x", a.userId, s.state, "code")).result).toBe("expired");
    expect((await finishDirectConnect("linkedin", a.userId, s.state, "code")).result).toBe("connected");
    expect((await finishDirectConnect("linkedin", a.userId, s.state, "code")).result).toBe("expired");
    const exchange = new URLSearchParams(String(calls.find((c) => c.url.endsWith("/oauth/v2/accessToken"))!.init!.body));
    expect(exchange.get("client_secret")).toBe("li-secret");
    const account = await db.socialAccount.findFirstOrThrow({ where: { platform: "LINKEDIN" } });
    expect(account).toMatchObject({ workspaceId: a.id, name: "Asha Patil", platformUserId: "abc123", claimKey: "linkedin:abc123", status: "ACTIVE" });
    expect(account.tokenCipher).not.toContain("li-access");
    expect(openTokens<{ access: string }>(account.tokenCipher!).access).toBe("li-access");
  });

  it("will not take a profile another workspace already has", async () => {
    await finishDirectConnect("linkedin", a.userId, (await begin(a)).state, "code");
    expect((await finishDirectConnect("linkedin", b.userId, (await begin(b)).state, "code")).result).toBe("taken");
  });

  it("stays active through the MuAPI check and asks for a reconnect once its 60 days end", async () => {
    await finishDirectConnect("linkedin", a.userId, (await begin(a)).state, "code");
    await db.socialAccount.updateMany({ data: { lastCheckedAt: null } });
    await syncAccounts((await membership(a.userId, a.id))!, 0);
    const account = await db.socialAccount.findFirstOrThrow({ where: { platform: "LINKEDIN" } });
    expect(account.status).toBe("ACTIVE");
    // No refresh token: an expired sign-in means reconnecting.
    await db.socialAccount.update({ where: { id: account.id }, data: { tokenCipher: sealTokens({ access: "old", refresh: null, expiresAt: Date.now() - 1 }) } });
    await expect(directAccessToken(a.id, account.id)).rejects.toMatchObject({ code: "SIGNED_OUT" });
    expect((await db.socialAccount.findUniqueOrThrow({ where: { id: account.id } })).status).toBe("NEEDS_RECONNECT");
  });

  it("posts to the member's own profile with a versioned request", async () => {
    await finishDirectConnect("linkedin", a.userId, (await begin(a)).state, "code");
    const account = await db.socialAccount.findFirstOrThrow({ where: { platform: "LINKEDIN" } });
    await expect(sendToLinkedIn(a.id, account.id, "x".repeat(3001))).rejects.toMatchObject({ code: "TOO_LONG" });
    expect(await sendToLinkedIn(a.id, account.id, "We are hiring bakers")).toEqual({ id: "urn:li:share:999", url: "https://www.linkedin.com/feed/update/urn:li:share:999/" });
    const post = calls.find((c) => c.url.endsWith("/rest/posts"))!;
    const headers = post.init!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer li-access");
    expect(headers["LinkedIn-Version"]).toMatch(/^\d{6}$/);
    expect(JSON.parse(String(post.init!.body))).toMatchObject({ author: "urn:li:person:abc123", commentary: "We are hiring bakers", visibility: "PUBLIC", lifecycleState: "PUBLISHED" });
  });

  it("finds an active API version when LinkedIn retires one, and remembers it", async () => {
    const months = versionsToTry(new Date(Date.UTC(2026, 10, 15)));
    expect(months.slice(0, 3)).toEqual(["202611", "202610", "202609"]);
    expect(months).toHaveLength(10);

    await finishDirectConnect("linkedin", a.userId, (await begin(a)).state, "code");
    const account = await db.socialAccount.findFirstOrThrow({ where: { platform: "LINKEDIN" } });
    const [newest, second, third] = versionsToTry();
    inactive.add(newest).add(second);
    expect((await sendToLinkedIn(a.id, account.id, "Hello")).id).toBe("urn:li:share:999");
    const tried = calls.filter((c) => c.url.endsWith("/rest/posts")).map((c) => (c.init!.headers as Record<string, string>)["LinkedIn-Version"]);
    expect(tried).toEqual([newest, second, third]);
    // The next post goes straight to the version that worked.
    calls.length = 0;
    await sendToLinkedIn(a.id, account.id, "Again");
    expect(calls.filter((c) => c.url.endsWith("/rest/posts")).map((c) => (c.init!.headers as Record<string, string>)["LinkedIn-Version"])).toEqual([third]);

    // Every version refused: a clear failure, never "might have posted".
    for (const v of versionsToTry()) inactive.add(v);
    await expect(sendToLinkedIn(a.id, account.id, "Nope")).rejects.toMatchObject({ code: "VERSION", status: 400 });
  });
});
