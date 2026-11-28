import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Real MySQL, on this computer only, with a stand-in for Pinterest. Anything else is refused.
const url = process.env.TEST_DATABASE_URL ?? "";
const local = (() => {
  try {
    const u = new URL(url);
    return ["127.0.0.1", "localhost"].includes(u.hostname) && u.pathname.endsWith("_test");
  } catch {
    return false;
  }
})();

describe.skipIf(!local)("Pinterest connections (local MySQL, stand-in Pinterest)", async () => {
  if (!local) return;
  process.env.DATABASE_URL = url;
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  process.env.NEXTAUTH_SECRET = "test-secret-that-is-long-enough";
  process.env.PINTEREST_CLIENT_ID = "pin-client";
  process.env.PINTEREST_CLIENT_SECRET = "pin-secret";
  process.env.PINTEREST_CALLBACK_URL = "http://localhost:3000/api/social/pinterest/callback";
  process.env.MUAPI_API_KEY = "fake-test-key";
  process.env.MUAPI_BASE_URL = "http://127.0.0.1:9";
  const db = new PrismaClient({ datasourceUrl: url });
  const { createWorkspace, membership } = await import("../src/server/workspaces");
  const { finishDirectConnect, startConnect, directAccessToken, sendToPinterest, pinterestBoardsFor } = await import("../src/server/accounts");
  const { platformStates } = await import("../src/server/muapi");
  const { openTokens, sealTokens } = await import("../src/server/tokens");

  type W = { id: string; userId: string };
  let a: W, b: W;
  let calls: { url: string; init?: RequestInit }[];
  let issued = 0;

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
    issued = 0;
    vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      const u = new URL(String(input));
      if (u.hostname === "127.0.0.1") return reply(200, []);
      if (u.pathname === "/v5/oauth/token") {
        issued++;
        const refreshing = new URLSearchParams(String(init?.body)).get("grant_type") === "refresh_token";
        // On refresh Pinterest returns a new access token but keeps the same refresh token.
        return reply(200, { access_token: `pin-access-${issued}`, expires_in: 2_592_000, ...(refreshing ? {} : { refresh_token: "pin-refresh", refresh_token_expires_in: 31_536_000 }) });
      }
      if (u.pathname === "/v5/user_account") return reply(200, { id: "5551", username: "ashabakes", business_name: "Asha's Bakery", profile_image: "https://i.pinimg.com/a.jpg" });
      if (u.pathname === "/v5/boards") {
        if (!u.searchParams.get("bookmark")) return reply(200, { items: [{ id: "b1", name: "Cakes" }], bookmark: "next" });
        return reply(200, { items: [{ id: "b2", name: "Festive" }], bookmark: null });
      }
      if (u.pathname === "/v5/pins") return reply(201, { id: "8800" });
      return reply(404, {});
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  beforeAll(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterAll(() => db.$disconnect());

  async function connected(w: W) {
    const started = await startConnect((await membership(w.userId, w.id))!, w.userId, "pinterest");
    const state = new URL(started.url).searchParams.get("state")!;
    return { started, result: (await finishDirectConnect("pinterest", w.userId, state, "code")).result };
  }

  it("is offered only when its own keys are set", () => {
    expect(platformStates().pinterest).toBe("ready");
    const saved = process.env.PINTEREST_CLIENT_ID;
    process.env.PINTEREST_CLIENT_ID = "";
    expect(platformStates().pinterest).toBe("setup");
    process.env.PINTEREST_CLIENT_ID = saved;
  });

  it("asks Pinterest for account, board and Pin access only", async () => {
    const { url: link } = await startConnect((await membership(a.userId, a.id))!, a.userId, "pinterest");
    const u = new URL(link);
    expect(u.origin + u.pathname).toBe("https://www.pinterest.com/oauth/");
    expect(u.searchParams.get("scope")).toBe("user_accounts:read,boards:read,pins:read,pins:write");
    expect(u.searchParams.get("redirect_uri")).toBe(process.env.PINTEREST_CALLBACK_URL);
  });

  it("connects with the app's own credentials and keeps the tokens encrypted", async () => {
    expect((await connected(a)).result).toBe("connected");
    const token = calls.find((c) => c.url.endsWith("/v5/oauth/token"))!;
    expect((token.init!.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("pin-client:pin-secret").toString("base64")}`);
    const account = await db.socialAccount.findFirstOrThrow({ where: { platform: "PINTEREST" } });
    expect(account).toMatchObject({ name: "Asha's Bakery", platformUserId: "5551", claimKey: "pinterest:5551", status: "ACTIVE" });
    expect(account.tokenCipher).not.toContain("pin-access-1");
    expect((await connected(b)).result).toBe("taken");
  });

  it("renews an expiring token and keeps the refresh token Pinterest did not replace", async () => {
    await connected(a);
    const account = await db.socialAccount.findFirstOrThrow({ where: { platform: "PINTEREST" } });
    await db.socialAccount.update({ where: { id: account.id }, data: { tokenCipher: sealTokens({ access: "old", refresh: "pin-refresh", expiresAt: Date.now() }) } });
    expect((await directAccessToken(a.id, account.id)).access).toBe("pin-access-2");
    const stored = openTokens<{ refresh: string }>((await db.socialAccount.findUniqueOrThrow({ where: { id: account.id } })).tokenCipher!);
    expect(stored.refresh).toBe("pin-refresh");
  });

  it("lists every board and creates a Pin from a photo", async () => {
    await connected(a);
    const account = await db.socialAccount.findFirstOrThrow({ where: { platform: "PINTEREST" } });
    expect(await pinterestBoardsFor(a.id, account.id)).toEqual([{ id: "b1", name: "Cakes" }, { id: "b2", name: "Festive" }]);
    const pin = { boardId: "b1", imageUrl: "https://socialgem.online/m/abc.jpg", title: "Mango cake", description: "Fresh today" };
    await expect(sendToPinterest(a.id, account.id, { ...pin, imageUrl: "" })).rejects.toMatchObject({ code: "MEDIA" });
    await expect(sendToPinterest(a.id, account.id, { ...pin, boardId: "" })).rejects.toMatchObject({ code: "BOARD" });
    expect(await sendToPinterest(a.id, account.id, pin)).toEqual({ id: "8800", url: "https://www.pinterest.com/pin/8800/" });
    const sent = JSON.parse(String(calls.find((c) => c.url.endsWith("/v5/pins"))!.init!.body));
    expect(sent).toMatchObject({ board_id: "b1", title: "Mango cake", media_source: { source_type: "image_url", url: pin.imageUrl } });
    // Another workspace cannot use this account.
    await expect(pinterestBoardsFor(b.id, account.id)).rejects.toThrow();
  });
});
