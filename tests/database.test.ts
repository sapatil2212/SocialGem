import { Prisma, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Real MySQL, on this computer only. Anything else is refused.
const url = process.env.TEST_DATABASE_URL ?? "";
const local = (() => {
  try {
    const u = new URL(url);
    return ["127.0.0.1", "localhost"].includes(u.hostname) && u.pathname.endsWith("_test");
  } catch {
    return false;
  }
})();

describe.skipIf(!local)("database rules (local MySQL)", async () => {
  if (!local) return;
  process.env.DATABASE_URL = url;
  process.env.MUAPI_API_KEY = "fake-test-key";
  process.env.MUAPI_BASE_URL = "http://127.0.0.1:9";
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  const db = new PrismaClient({ datasourceUrl: url });
  const other = new PrismaClient({ datasourceUrl: url });
  const { dataFor } = await import("../src/server/data");
  const { createWorkspace, membership } = await import("../src/server/workspaces");
  const { finishConnect, startConnect } = await import("../src/server/accounts");

  type W = { id: string; userId: string; accountId: string };
  let a: W, b: W;

  async function seed(name: string): Promise<W> {
    const user = await db.user.create({ data: { email: `${name}@example.com` } });
    const w = await createWorkspace(user.id, { name: `Brand ${name}`, timezone: "Asia/Kolkata" });
    const account = await db.socialAccount.create({ data: { workspaceId: w.id, platform: "FACEBOOK", name: `Page ${name}`, muapiAccountId: name === "a" ? 11 : 22, claimKey: `facebook:${name}` } });
    return { id: w.id, userId: user.id, accountId: account.id };
  }

  const newPost = (w: W, over = {}) => ({
    createdById: w.userId, title: "", caption: "hello", mediaUrl: "", tag: null, scheduledAt: new Date(Date.now() - 1000), draft: false,
    targets: [{ platform: "facebook", socialAccountId: w.accountId, caption: null, mediaUrl: "", options: {} }], ...over,
  });

  beforeEach(async () => {
    for (const t of ["PublishAttempt", "PostTarget", "Post", "PostTag", "MediaAsset", "SocialAccount", "ConnectAttempt", "LedgerEntry", "Invoice", "Payment", "Subscription", "Notification", "WorkspaceMember", "Workspace", "BillingAccount", "User"]) {
      await db.$executeRawUnsafe("DELETE FROM " + t);
    }
    a = await seed("a");
    b = await seed("b");
  });
  beforeAll(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterAll(async () => {
    await db.$disconnect();
    await other.$disconnect();
  });

  describe("tenancy", () => {
    it("refuses a target on another workspace's account, media or post", async () => {
      const [mine] = await dataFor(a.id).posts.create(newPost(a));
      const media = await db.mediaAsset.create({ data: { workspaceId: b.id, name: "m", mimeType: "image/png", sizeBytes: 1 } });
      const base = { workspaceId: a.id, postId: mine.postId, platform: "X" as const, options: {} };
      const code = (p: Promise<unknown>) => p.then(() => "allowed", (e) => e.code);
      expect(await code(db.postTarget.create({ data: { ...base, socialAccountId: b.accountId } }))).toBe("P2003");
      expect(await code(db.postTarget.create({ data: { ...base, mediaId: media.id } }))).toBe("P2003");
      expect(await code(db.postTarget.create({ data: { ...base, workspaceId: b.id } }))).toBe("P2003");
      expect(await code(db.post.update({ where: { id: mine.postId }, data: { mediaId: media.id } }))).toBe("P2003");
    });
    it("hides and protects another workspace's rows", async () => {
      const data = dataFor(a.id);
      const [post] = await data.posts.create(newPost(a, { tag: { name: "T", color: "#112233" } }));
      const media = await data.media.create({ name: "m", url: "https://cdn.example.com/m.png" });
      const [tag] = await data.tags.list();
      const evil = dataFor(b.id);
      expect(await evil.posts.list()).toEqual([]);
      expect(await evil.posts.raw(post.id)).toBeNull();
      expect(await evil.posts.remove(post.id)).toBe(false);
      expect(await evil.media.update(media.id, { name: "x" })).toBeNull();
      expect(await evil.media.remove(media.id)).toBe(false);
      expect(await evil.tags.remove(tag.id)).toBe(false);
      expect(await evil.accounts.get(a.accountId)).toBeNull();
      expect(await membership(b.userId, a.id)).toBeNull();
      expect((await data.tags.list()).length).toBe(1);
      expect((await db.post.findUnique({ where: { id: post.postId } }))!.tagId).toBe(tag.id);
    });
    it("archived workspaces disappear", async () => {
      await db.workspace.update({ where: { id: a.id }, data: { archivedAt: new Date() } });
      expect(await membership(a.userId, a.id)).toBeNull();
    });
  });

  describe("posts", () => {
    it("makes one post from a repeated request", async () => {
      const make = () => dataFor(a.id).posts.create(newPost(a, { requestKey: "same-key-123" }));
      const [x, y] = await Promise.all([make(), make()]);
      expect(x[0].id).toBe(y[0].id);
      expect(await db.post.count()).toBe(1);
    });
    it("is all or nothing", async () => {
      const bad = newPost(a, { targets: [newPost(a).targets[0], { platform: "instagram", socialAccountId: b.accountId, caption: null, mediaUrl: "", options: {} }] });
      await expect(dataFor(a.id).posts.create(bad)).rejects.toThrow();
      expect(await db.post.count()).toBe(0);
    });
    it("keeps sent posts and their history", async () => {
      const [post] = await dataFor(a.id).posts.create(newPost(a));
      await db.postTarget.update({ where: { id: post.id }, data: { status: "PUBLISHED" } });
      const current = (await dataFor(a.id).posts.raw(post.id))!;
      expect(await dataFor(a.id).posts.update(current, { scheduledAt: new Date(), status: "SCHEDULED" })).toBeNull();
      expect(await dataFor(a.id).posts.remove(post.id)).toBe(false);
      await db.publishAttempt.create({ data: { targetId: post.id, number: 1 } });
      await expect(db.post.delete({ where: { id: post.postId } })).rejects.toThrow();
    });
    it("drafts are never claimable; scheduled ones are", async () => {
      const [draft] = await dataFor(a.id).posts.create(newPost(a, { draft: true }));
      const [due] = await dataFor(a.id).posts.create(newPost(a));
      const rows = await db.postTarget.findMany({ where: { claimAt: { not: null } } });
      expect(rows.map((r) => r.id)).toEqual([due.id]);
      expect(draft.status).toBe("draft");
    });
    it("does not delete media in use, and cleans up after removal", async () => {
      const data = dataFor(a.id);
      const [post] = await data.posts.create(newPost(a, { mediaUrl: "https://cdn.example.com/a.png", draft: true }));
      const [media] = await data.media.list();
      await expect(data.media.remove(media.id)).rejects.toThrow(/still uses/);
      expect(await data.posts.remove(post.id)).toBe(true);
      expect(await db.post.count()).toBe(0);
      expect(await data.media.remove(media.id)).toBe(true);
    });
  });

  // The query the M4 worker will use, proven here on real MySQL.
  const claim = (client: PrismaClient, limit: number, hold?: { locked: () => void; until: Promise<void> }) =>
    client.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM PostTarget FORCE INDEX (PostTarget_claimAt_idx) WHERE claimAt <= UTC_TIMESTAMP(3) ORDER BY claimAt LIMIT ${limit} FOR UPDATE SKIP LOCKED`;
        if (hold) {
          hold.locked();
          await hold.until;
        }
        if (rows.length) await tx.$executeRaw`UPDATE PostTarget SET status = 'QUEUED', claimAt = UTC_TIMESTAMP(3) + INTERVAL 2 MINUTE WHERE id IN (${Prisma.join(rows.map((r) => r.id))})`;
        return rows.map((r) => r.id);
      },
      { isolationLevel: "ReadCommitted", timeout: 15_000 }
    );

  // Holds the locks until released, so the tests depend on order and not on the clock.
  async function holdClaim() {
    let locked!: () => void, release!: () => void;
    const ready = new Promise<void>((r) => (locked = r));
    const until = new Promise<void>((r) => (release = r));
    const taken = claim(db, 5, { locked, until });
    await ready;
    return { taken, release };
  }

  describe("claiming", () => {
    it("two workers never take the same post, and neither waits", async () => {
      for (let i = 0; i < 12; i++) await dataFor(a.id).posts.create(newPost(a));
      const slow = await holdClaim();
      const fast = await claim(other, 5);
      slow.release();
      const first = await slow.taken;
      expect(first).toHaveLength(5);
      expect(fast).toHaveLength(5);
      expect(new Set([...first, ...fast]).size).toBe(10);
      expect(await claim(db, 50)).toHaveLength(2);
      expect(await claim(db, 50)).toHaveLength(0);
    });
    it("does not block editing a post that was not taken", async () => {
      await dataFor(a.id).posts.create(newPost(a));
      const [later] = await dataFor(a.id).posts.create(newPost(a, { scheduledAt: new Date(Date.now() + 3600_000) }));
      const slow = await holdClaim();
      const current = (await dataFor(a.id).posts.raw(later.id))!;
      await dataFor(a.id).posts.update(current, { caption: "edited", scheduledAt: later.scheduledAt, status: "SCHEDULED" });
      slow.release();
      expect(await slow.taken).toHaveLength(1);
    });
  });

  describe("billing", () => {
    it("parallel reservations cannot overspend", async () => {
      const billing = (await db.billingAccount.findFirst({ where: { ownerUserId: a.userId } }))!;
      const add = (type: "GRANT" | "RESERVE", amount: number, key: string, tx: Prisma.TransactionClient = db) =>
        tx.ledgerEntry.create({ data: { billingAccountId: billing.id, unit: "POST", type, amount, periodKey: "p1", idempotencyKey: key } });
      await add("GRANT", 3, "g1");
      const reserve = (i: number) =>
        db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM BillingAccount WHERE id = ${billing.id} FOR UPDATE`;
          const [{ total }] = await tx.$queryRaw<{ total: bigint }[]>`SELECT COALESCE(SUM(amount), 0) AS total FROM LedgerEntry WHERE billingAccountId = ${billing.id} AND unit = 'POST' AND periodKey = 'p1'`;
          if (Number(total) < 1) return false;
          await add("RESERVE", -1, `r${i}`, tx);
          return true;
        }, { isolationLevel: "ReadCommitted", timeout: 15_000, maxWait: 15_000 });
      const results = await Promise.all(Array.from({ length: 8 }, (_, i) => reserve(i)));
      expect(results.filter(Boolean)).toHaveLength(3);
      await expect(add("GRANT", 3, "g1")).rejects.toThrow();
    });
    it("limits workspaces even in parallel", async () => {
      const user = await db.user.create({ data: { email: "many@example.com" } });
      await createWorkspace(user.id, { name: "First", timezone: "Asia/Kolkata" });
      const made = await Promise.allSettled(Array.from({ length: 24 }, (_, i) => createWorkspace(user.id, { name: `W ${i}`, timezone: "Asia/Kolkata" })));
      expect(await db.workspace.count({ where: { members: { some: { userId: user.id } } } })).toBe(20);
      expect(made.filter((m) => m.status === "rejected")).toHaveLength(5);
    });
    it("refuses a bad GSTIN and negative money", async () => {
      const billing = (await db.billingAccount.findFirst())!;
      await expect(db.billingAccount.update({ where: { id: billing.id }, data: { gstin: "SHORT" } })).rejects.toThrow();
      await expect(db.payment.create({ data: { billingAccountId: billing.id, provider: "RAZORPAY", providerRef: "p", amountMinor: -1, currency: "INR", status: "CREATED", planKey: "x" } })).rejects.toThrow();
    });
  });

  it("treats case and accents as different where it matters", async () => {
    await db.user.create({ data: { email: "jose@example.com" } });
    expect(await db.user.findUnique({ where: { email: "josé@example.com" } })).toBeNull();
  });

  describe("connecting accounts", () => {
    type Remote = { id: number; platform_name: string; account_name: string; platform_user_id: string; connected: boolean };
    let remote: Remote[] = [];
    const page = (id: number, over: Partial<Remote> = {}): Remote => ({ id, platform_name: "facebook", account_name: `Page ${id}`, platform_user_id: `fb${id}`, connected: true, ...over });
    let sent: { url: string; body: string }[] = [];
    beforeEach(() => {
      remote = [];
      sent = [];
      vi.stubGlobal("fetch", async (u: string, init?: RequestInit) => {
        sent.push({ url: u, body: String(init?.body ?? "") });
        return Response.json(u.includes("connect-url") ? { url: "https://facebook.example/o" } : remote);
      });
    });
    const start = async (w: W) => {
      await startConnect((await membership(w.userId, w.id))!, w.userId, "facebook");
      const body = JSON.parse(sent.at(-1)!.body);
      return { state: new URL(body.redirect_to).searchParams.get("state")!, external: body.external_user_id as string };
    };
    const count = (w: W) => db.socialAccount.count({ where: { workspaceId: w.id } });

    it("adds only what appeared, once, for the person who started", async () => {
      remote = [page(500)];
      const { state, external } = await start(a);
      expect(external).not.toContain("@");
      remote = [page(500), page(501)];
      expect((await finishConnect(b.userId, state)).result).toBe("expired");
      expect((await finishConnect(a.userId, state)).result).toBe("connected");
      expect((await finishConnect(a.userId, state)).result).toBe("expired");
      const rows = await db.socialAccount.findMany({ where: { workspaceId: a.id }, select: { muapiAccountId: true } });
      expect(rows.map((r) => r.muapiAccountId).sort()).toEqual([11, 501]);
    });
    it("adds nothing on denial, wrong platform or an old link", async () => {
      let s = await start(a);
      expect((await finishConnect(a.userId, s.state)).result).toBe("none");
      s = await start(a);
      remote = [page(600, { platform_name: "instagram" }), page(601, { connected: false })];
      expect((await finishConnect(a.userId, s.state)).result).toBe("none");
      s = await start(a);
      await db.connectAttempt.updateMany({ data: { expiresAt: new Date(0) } });
      remote = [page(602)];
      expect((await finishConnect(a.userId, s.state)).result).toBe("expired");
      expect(await count(a)).toBe(1);
    });
    it("refuses a Page another workspace holds", async () => {
      let s = await start(a);
      remote = [page(700)];
      expect((await finishConnect(a.userId, s.state)).result).toBe("connected");
      remote = [];
      s = await start(b);
      remote = [page(701, { platform_user_id: "fb700" })];
      expect((await finishConnect(b.userId, s.state)).result).toBe("taken");
      expect(await count(b)).toBe(1);
    });
    it("reconnects the same row", async () => {
      let s = await start(a);
      remote = [page(800)];
      await finishConnect(a.userId, s.state);
      const row = (await db.socialAccount.findUnique({ where: { muapiAccountId: 800 } }))!;
      await dataFor(a.id).accounts.disconnect(row.id);
      s = await start(a);
      expect((await finishConnect(a.userId, s.state)).result).toBe("connected");
      expect((await db.socialAccount.findUnique({ where: { id: row.id } }))!.status).toBe("ACTIVE");
      expect(await count(a)).toBe(2);
    });
  });
});
