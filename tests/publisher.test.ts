import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Real MySQL, on this computer only, with stand-ins for MuAPI and X. Anything else is refused.
const url = process.env.TEST_DATABASE_URL ?? "";
const local = (() => {
  try {
    const u = new URL(url);
    return ["127.0.0.1", "localhost"].includes(u.hostname) && u.pathname.endsWith("_test");
  } catch {
    return false;
  }
})();

describe.skipIf(!local)("publisher (local MySQL, stand-in platforms)", async () => {
  if (!local) return;
  process.env.DATABASE_URL = url;
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  process.env.NEXTAUTH_SECRET = "test-secret-that-is-long-enough";
  process.env.MUAPI_API_KEY = "fake-test-key";
  process.env.MUAPI_BASE_URL = "http://127.0.0.1:9";
  const db = new PrismaClient({ datasourceUrl: url });
  const { createWorkspace } = await import("../src/server/workspaces");
  const { dataFor } = await import("../src/server/data");
  const { publishDue, pollAccepted, recoverStuck } = await import("../src/server/publisher");
  const { sealTokens } = await import("../src/server/tokens");

  let w: { id: string; userId: string; fb: string; x: string };
  const sent: { path: string; body: Record<string, unknown> }[] = [];
  const mode = { publish: "ok" as "ok" | "refuse" | "down", result: "processing" as "processing" | "completed" | "failed" };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const later = (ms: number) => new Date(Date.now() + ms);

  beforeEach(async () => {
    for (const t of ["AiUsage", "AiJob", "ContentIdea", "ContentPlan", "ContentResearch", "BrandProfile", "PublishAttempt", "PostTarget", "Post", "PostTag", "MediaAsset", "SocialAccount", "ConnectAttempt", "LedgerEntry", "Invoice", "Payment", "Subscription", "Notification", "WorkspaceMember", "Workspace", "BillingAccount", "User"]) {
      await db.$executeRawUnsafe("DELETE FROM " + t);
    }
    const user = await db.user.create({ data: { email: "pub@example.com" } });
    const ws = await createWorkspace(user.id, { name: "Brand", timezone: "Asia/Kolkata" });
    const fb = await db.socialAccount.create({ data: { workspaceId: ws.id, platform: "FACEBOOK", name: "Page", muapiAccountId: 11, claimKey: "facebook:p1" } });
    const x = await db.socialAccount.create({
      data: { workspaceId: ws.id, platform: "X", name: "@shop", platformUserId: "77", claimKey: "x:77", tokenCipher: sealTokens({ access: "x-access", refresh: "r", expiresAt: Date.now() + 3600_000 }) },
    });
    w = { id: ws.id, userId: user.id, fb: fb.id, x: x.id };
    sent.length = 0;
    Object.assign(mode, { publish: "ok", result: "processing" });
    vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
      const u = new URL(String(input));
      if (u.pathname.endsWith("-publish") || u.pathname === "/2/tweets") {
        sent.push({ path: u.pathname, body: JSON.parse(String(init?.body)) });
        if (u.pathname === "/2/tweets") return reply(201, { data: { id: "1900" } });
        if (mode.publish === "down") throw new TypeError("fetch failed");
        if (mode.publish === "refuse") return reply(400, { detail: "Caption too long" });
        return reply(200, { request_id: `req-${sent.length}`, status: "processing" });
      }
      if (u.pathname.startsWith("/api/v1/predictions/")) {
        if (mode.result === "completed") return reply(200, { id: "req", status: "completed", output: { platform: "facebook", url: "https://facebook.com/p/1", post_id: "fb1" } });
        if (mode.result === "failed") return reply(200, { id: "req", status: "failed", error: "Page not allowed" });
        return reply(200, { id: "req", status: "processing" });
      }
      return reply(404, {});
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  beforeAll(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterAll(() => db.$disconnect());

  async function due(platform: "facebook" | "x_twitter", account: string, n = 1, caption = "Fresh batch at 5 pm") {
    for (let i = 0; i < n; i++) {
      await dataFor(w.id).posts.create({
        createdById: w.userId, requestKey: `k-${platform}-${i}-${Math.random()}`, title: "", caption, mediaUrl: platform === "facebook" ? "https://app.example.com/m/aaaa.jpg" : "", tag: null,
        scheduledAt: new Date(Date.now() - 1000), draft: false, targets: [{ platform, socialAccountId: account, caption: null, mediaUrl: "", options: {} }],
      });
    }
    return db.postTarget.findMany({ where: { workspaceId: w.id } });
  }

  it("sends each due post exactly once, even with two workers at the same time", async () => {
    await due("facebook", w.fb, 6);
    await Promise.all([publishDue(new Date(), 10), publishDue(new Date(), 10)]);
    expect(sent).toHaveLength(6);
    const rows = await db.postTarget.findMany();
    expect(rows.every((r) => r.status === "PUBLISHING" && r.pollAt && r.attemptCount === 1)).toBe(true);
    expect(await db.publishAttempt.count({ where: { state: "ACCEPTED" } })).toBe(6);
    expect(sent[0].body).toMatchObject({ account_id: 11, caption: "Fresh batch at 5 pm", media_url: "https://app.example.com/m/aaaa.jpg", media_type: "IMAGE" });
    // Nothing is sent again on later passes.
    await publishDue(later(60_000));
    expect(sent).toHaveLength(6);
  });

  it("follows an accepted send until it is published", async () => {
    await due("facebook", w.fb);
    await publishDue();
    await pollAccepted(later(20_000));
    expect((await db.postTarget.findFirstOrThrow()).status).toBe("PUBLISHING");
    mode.result = "completed";
    await pollAccepted(later(10 * 60_000));
    const t = await db.postTarget.findFirstOrThrow();
    expect(t).toMatchObject({ status: "PUBLISHED", publishedUrl: "https://facebook.com/p/1", platformPostId: "fb1", leaseToken: null });
    expect((await db.publishAttempt.findFirstOrThrow()).state).toBe("SUCCEEDED");
  });

  it("marks a refusal as failed, and asks a person when the result is unclear", async () => {
    mode.publish = "refuse";
    await due("facebook", w.fb);
    await publishDue();
    expect(await db.postTarget.findFirstOrThrow()).toMatchObject({ status: "FAILED", errorCode: "REFUSED" });
    expect((await db.postTarget.findFirstOrThrow()).errorMessage).toContain("Caption too long");

    await db.publishAttempt.deleteMany({});
    await db.postTarget.deleteMany({});
    mode.publish = "down";
    await due("facebook", w.fb);
    await publishDue();
    expect((await db.postTarget.findMany({ where: { status: { not: "FAILED" } } }))[0]).toMatchObject({ status: "NEEDS_CHECK" });
    mode.result = "failed";
  });

  it("reports a failure MuAPI sends back later", async () => {
    await due("facebook", w.fb);
    await publishDue();
    mode.result = "failed";
    await pollAccepted(later(20_000));
    const t = await db.postTarget.findFirstOrThrow();
    expect(t.status).toBe("FAILED");
    expect(t.errorMessage).toContain("Page not allowed");
  });

  it("never resends after a crash mid-send, and retries one that was never sent", async () => {
    const [t] = await due("facebook", w.fb);
    // Crashed after writing the attempt: it may have been posted.
    await db.postTarget.update({ where: { id: t.id }, data: { status: "PUBLISHING", leaseToken: "dead", claimAt: new Date(Date.now() - 1000), attemptCount: 1 } });
    await db.publishAttempt.create({ data: { targetId: t.id, number: 1 } });
    await recoverStuck();
    await publishDue();
    expect(sent).toHaveLength(0);
    expect(await db.postTarget.findUniqueOrThrow({ where: { id: t.id } })).toMatchObject({ status: "NEEDS_CHECK", errorCode: "INTERRUPTED" });

    // Crashed right after claiming, before anything was written: safe to send.
    const [, u] = await due("facebook", w.fb, 2);
    await db.postTarget.update({ where: { id: u.id }, data: { status: "PUBLISHING", leaseToken: "dead", claimAt: new Date(Date.now() - 1000), attemptCount: 1 } });
    await recoverStuck();
    await publishDue();
    expect(sent.filter((s) => s.path === "/api/v1/facebook-publish")).toHaveLength(2);
    expect((await db.postTarget.findUniqueOrThrow({ where: { id: u.id } })).attemptCount).toBe(1);
  });

  it("holds back posts that are hours late instead of sending old news", async () => {
    const [t] = await due("facebook", w.fb);
    await db.postTarget.update({ where: { id: t.id }, data: { claimAt: new Date(Date.now() - 7 * 3600_000) } });
    await publishDue();
    expect(sent).toHaveLength(0);
    expect(await db.postTarget.findUniqueOrThrow({ where: { id: t.id } })).toMatchObject({ status: "FAILED", errorCode: "LATE" });
  });

  it("publishes to X directly, and refuses a switched-off account without sending", async () => {
    await due("x_twitter", w.x);
    await publishDue();
    expect(await db.postTarget.findFirstOrThrow()).toMatchObject({ status: "PUBLISHED", publishedUrl: "https://x.com/i/web/status/1900", platformPostId: "1900" });
    expect(sent[0].body).toEqual({ text: "Fresh batch at 5 pm" });

    await db.publishAttempt.deleteMany({});
    await db.postTarget.deleteMany({});
    await db.socialAccount.update({ where: { id: w.x }, data: { status: "DISCONNECTED" } });
    await due("x_twitter", w.x);
    await publishDue();
    expect(sent).toHaveLength(1);
    expect(await db.postTarget.findFirstOrThrow()).toMatchObject({ status: "FAILED", errorCode: "ACCOUNT" });
  });
});
