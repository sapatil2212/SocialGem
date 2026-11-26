import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// M7: AI studio ideas belong to one workspace, enforced by the database and by every route.
const url = process.env.TEST_DATABASE_URL ?? "";
const local = /^mysql:\/\/[^@]+@(127\.0\.0\.1|localhost):\d+\/\w+_test/.test(url);
const box = vi.hoisted(() => ({ user: null as null | { id: string; email: string } }));
vi.mock("next-auth/next", () => ({ getServerSession: async () => (box.user ? { user: box.user } : null) }));

describe.skipIf(!local)("AI studio tenancy (local MySQL)", async () => {
  if (!local) return;
  process.env.DATABASE_URL = url;
  process.env.PLATFORMS_ENABLED = "facebook,instagram";
  const db = new PrismaClient({ datasourceUrl: url });
  const studioRoute = await import("../src/app/api/w/[wid]/studio/route");
  const planRoute = await import("../src/app/api/w/[wid]/studio/plans/[id]/route");
  const ideaRoute = await import("../src/app/api/w/[wid]/studio/plans/[id]/ideas/[idea]/route");
  const scheduleRoute = await import("../src/app/api/w/[wid]/studio/plans/[id]/schedule/route");

  type Side = { user: { id: string; email: string }; ws: string; plan: string; idea: string; media: string };
  let a: Side;
  let b: Side;

  const make = async (name: string): Promise<Side> => {
    const user = await db.user.create({ data: { email: `${name}@example.com`, emailVerified: new Date() } });
    const billing = await db.billingAccount.create({ data: { ownerUserId: user.id } });
    const ws = await db.workspace.create({ data: { name, billingAccountId: billing.id, members: { create: { userId: user.id, role: "OWNER" } } } });
    const media = await db.mediaAsset.create({ data: { workspaceId: ws.id, sourceUrl: `https://cdn.example.com/${name}.jpg`, name, mimeType: "image/jpeg", sizeBytes: 1, status: "READY" } });
    // Created the way the app creates them: through the plan, which fills in the owner.
    const plan = await db.contentPlan.create({
      data: {
        workspaceId: ws.id, title: `${name} plan`, goal: "", strategy: "s", startDay: "2026-12-01", days: 7, platforms: ["facebook"],
        ideas: { create: { position: 0, scheduledAt: new Date(Date.now() + 864e5), platforms: ["facebook"], format: "text", pillar: "p", topic: `${name} secret idea`, angle: "a", captions: { facebook: `${name} caption` }, status: "READY" } },
      },
      include: { ideas: true },
    });
    return { user: { id: user.id, email: user.email! }, ws: ws.id, plan: plan.id, idea: plan.ideas[0].id, media: media.id };
  };

  const call = async (handler: (r: Request, c: { params: Promise<Record<string, string>> }) => Promise<Response>, method: string, params: Record<string, string>, body?: object) => {
    const request = new Request("http://app.test/api", { method, headers: { host: "app.test", origin: "http://app.test", "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const response = await handler(request, { params: Promise.resolve(params) });
    return { status: response.status, text: await response.text() };
  };
  const leaks = (text: string) => /alice secret idea|alice caption|alice plan/.test(text);
  const ideaOf = (id: string) => db.contentIdea.findUniqueOrThrow({ where: { id } });
  const fails = (p: Promise<unknown>) => p.then(() => "ok", (e: { code?: string }) => e.code ?? "error");

  beforeEach(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const t of ["AiUsage", "AiJob", "ContentIdea", "ContentPlan", "ContentResearch", "BrandProfile", "PublishAttempt", "PostTarget", "Post", "PostTag", "MediaAsset", "SocialAccount", "ConnectAttempt", "LedgerEntry", "WorkspaceMember", "Workspace", "BillingAccount", "Account", "VerificationToken", "RateLimit", "AuditLog", "User"]) await db.$executeRawUnsafe("DELETE FROM " + t);
    a = await make("alice");
    b = await make("bob");
    box.user = b.user;
  });
  afterAll(() => db.$disconnect());

  describe("the database", () => {
    it("fills in the owner when ideas are made through a plan", async () => {
      expect((await ideaOf(a.idea)).workspaceId).toBe(a.ws);
      expect((await ideaOf(b.idea)).workspaceId).toBe(b.ws);
    });
    it("rejects an idea whose plan belongs to another workspace", async () => {
      expect(await fails(db.contentIdea.create({ data: { workspaceId: b.ws, planId: a.plan, position: 1, scheduledAt: new Date(), platforms: [], format: "text", pillar: "p", topic: "t", angle: "a" } }))).toBe("P2003");
    });
    it("rejects an idea pointing at a workspace that does not exist", async () => {
      expect(await fails(db.contentIdea.create({ data: { workspaceId: "no-such-workspace", planId: a.plan, position: 1, scheduledAt: new Date(), platforms: [], format: "text", pillar: "p", topic: "t", angle: "a" } }))).toBe("P2003");
    });
    it("rejects another workspace's image, even by direct update", async () => {
      expect(await fails(db.contentIdea.update({ where: { id: a.idea }, data: { mediaId: b.media } }))).toBe("P2003");
      expect(await fails(db.$executeRawUnsafe("UPDATE ContentIdea SET mediaId = ? WHERE id = ?", b.media, a.idea))).not.toBe("ok");
      expect((await ideaOf(a.idea)).mediaId).toBeNull();
      await db.contentIdea.update({ where: { id: a.idea }, data: { mediaId: a.media } });
      expect((await ideaOf(a.idea)).mediaId).toBe(a.media);
    });
    it("rejects moving an idea to another workspace", async () => {
      expect(await fails(db.$executeRawUnsafe("UPDATE ContentIdea SET workspaceId = ? WHERE id = ?", b.ws, a.idea))).not.toBe("ok");
      expect((await ideaOf(a.idea)).workspaceId).toBe(a.ws);
    });
    it("removes ideas with their plan, and keeps the image", async () => {
      await db.contentIdea.update({ where: { id: a.idea }, data: { mediaId: a.media } });
      await db.contentPlan.delete({ where: { id: a.plan } });
      expect(await db.contentIdea.count({ where: { id: a.idea } })).toBe(0);
      expect(await db.mediaAsset.count({ where: { id: a.media } })).toBe(1);
    });
  });

  describe("the routes, as Bob", () => {
    it("lists only his own plans", async () => {
      const own = await call(studioRoute.GET, "GET", { wid: b.ws });
      expect(own.status).toBe(200);
      expect(own.text).toContain("bob plan");
      expect(leaks(own.text)).toBe(false);
      const other = await call(studioRoute.GET, "GET", { wid: a.ws });
      expect([other.status, leaks(other.text)]).toEqual([404, false]);
    });
    it("cannot read Alice's ideas, by her workspace or through his own", async () => {
      for (const wid of [a.ws, b.ws]) {
        const r = await call(planRoute.GET, "GET", { wid, id: a.plan });
        expect([r.status, leaks(r.text)]).toEqual([404, false]);
      }
    });
    it("cannot change Alice's ideas", async () => {
      for (const wid of [a.ws, b.ws]) {
        const r = await call(ideaRoute.PATCH, "PATCH", { wid, id: a.plan, idea: a.idea }, { hashtags: "pwned", captions: { facebook: "pwned" } });
        expect(r.status).toBe(404);
      }
      // His own plan id with her idea id does not work either.
      expect((await call(ideaRoute.PATCH, "PATCH", { wid: b.ws, id: b.plan, idea: a.idea }, { hashtags: "pwned" })).status).toBe(404);
      const idea = await ideaOf(a.idea);
      expect([idea.hashtags, idea.captions]).toEqual([null, { facebook: "alice caption" }]);
    });
    it("cannot delete Alice's ideas", async () => {
      for (const params of [{ wid: a.ws, id: a.plan, idea: a.idea }, { wid: b.ws, id: a.plan, idea: a.idea }, { wid: b.ws, id: b.plan, idea: a.idea }]) {
        expect((await call(ideaRoute.DELETE, "DELETE", params)).status).not.toBe(200);
      }
      expect(await db.contentIdea.count({ where: { id: a.idea } })).toBe(1);
    });
    it("cannot schedule Alice's ideas", async () => {
      for (const params of [{ wid: a.ws, id: a.plan }, { wid: b.ws, id: a.plan }]) expect((await call(scheduleRoute.POST, "POST", params, { ideaIds: [a.idea] })).status).toBe(404);
      const mixed = await call(scheduleRoute.POST, "POST", { wid: b.ws, id: b.plan }, { ideaIds: [a.idea] });
      expect([mixed.status, JSON.parse(mixed.text).scheduled]).toEqual([200, 0]);
      expect((await ideaOf(a.idea)).status).toBe("READY");
      expect(await db.post.count()).toBe(0);
    });
    it("can still work on his own ideas", async () => {
      const edit = await call(ideaRoute.PATCH, "PATCH", { wid: b.ws, id: b.plan, idea: b.idea }, { hashtags: "chai, pune" });
      expect(edit.status).toBe(200);
      expect((await ideaOf(b.idea)).hashtags).toBe("chai, pune");
      const read = await call(planRoute.GET, "GET", { wid: b.ws, id: b.plan });
      expect(read.text).toContain("bob secret idea");
      expect((await call(ideaRoute.DELETE, "DELETE", { wid: b.ws, id: b.plan, idea: b.idea })).status).toBe(200);
    });
  });

  it("refuses everyone who is not signed in", async () => {
    box.user = null;
    expect((await call(studioRoute.GET, "GET", { wid: a.ws })).status).toBe(401);
    expect((await call(planRoute.GET, "GET", { wid: a.ws, id: a.plan })).status).toBe(401);
    expect((await call(ideaRoute.PATCH, "PATCH", { wid: a.ws, id: a.plan, idea: a.idea }, { hashtags: "x" })).status).toBe(401);
    expect((await call(ideaRoute.DELETE, "DELETE", { wid: a.ws, id: a.plan, idea: a.idea })).status).toBe(401);
    expect((await call(scheduleRoute.POST, "POST", { wid: a.ws, id: a.plan }, { ideaIds: [a.idea] })).status).toBe(401);
    expect(await db.contentIdea.count({ where: { id: a.idea, hashtags: null } })).toBe(1);
  });

  it("ignores a workspace named in the request body", async () => {
    const r = await call(ideaRoute.PATCH, "PATCH", { wid: b.ws, id: b.plan, idea: b.idea }, { hashtags: "x", workspaceId: a.ws });
    expect(r.status).toBe(200);
    expect((await ideaOf(b.idea)).workspaceId).toBe(b.ws);
  });
});
