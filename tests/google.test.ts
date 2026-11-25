import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const url = process.env.TEST_DATABASE_URL ?? "";
const local = /^mysql:\/\/[^@]+@(127\.0\.0\.1|localhost):\d+\/\w+_test/.test(url);
const box = vi.hoisted(() => ({ jar: new Map<string, string>(), options: {} as Record<string, unknown>, token: null as null | Record<string, unknown> }));
vi.mock("../src/server/mail", () => ({ sendCode: async () => {}, sendNotice: async () => {} }));
vi.mock("next-auth/jwt", () => ({ getToken: async () => box.token }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: (n: string) => (box.jar.has(n) ? { value: box.jar.get(n) } : undefined), set: (n: string, v: string, o: Record<string, unknown>) => { box.jar.set(n, v); box.options = o; } }),
}));

describe.skipIf(!local)("Google sign-in (local MySQL)", async () => {
  if (!local) return;
  process.env.DATABASE_URL = url;
  process.env.NEXTAUTH_SECRET = "test-secret-only";
  const db = new PrismaClient({ datasourceUrl: url });
  const g = await import("../src/server/google");
  const { hashPassword } = await import("../src/server/password");
  const PW = "Filter9coffee";
  const claims = (email: string, over = {}) => ({ email, email_verified: true, ...over });
  const outcome = (p: Promise<unknown>) => p.then(() => "ok", (e) => e.code as string);
  const make = async (email: string, over = {}) => db.user.create({ data: { email, passwordHash: await hashPassword(PW), emailVerified: new Date(), ...over } });
  const link = (userId: string, providerAccountId: string) => db.account.create({ data: { userId, type: "oauth", provider: "google", providerAccountId } });
  const as = (u: { id: string; sessionVersion: number }) => { box.token = { sub: u.id, version: u.sessionVersion }; };

  beforeEach(async () => {
    box.jar.clear();
    box.token = null;
    for (const t of ["PublishAttempt", "PostTarget", "Post", "PostTag", "MediaAsset", "SocialAccount", "ConnectAttempt", "LedgerEntry", "WorkspaceMember", "Workspace", "BillingAccount", "Account", "VerificationToken", "RateLimit", "AuditLog", "User"]) await db.$executeRawUnsafe("DELETE FROM " + t);
  });
  afterAll(() => db.$disconnect());

  it("accepts a new person, and only a confirmed plain address", async () => {
    expect(await g.checkGoogleSignIn("1", claims("new@gmail.com"))).toBe(true);
    for (const bad of [claims("new@gmail.com", { email_verified: false }), claims("new@gmail.com", { email_verified: "true" }), claims("victím@gmail.com"), undefined]) expect(await g.checkGoogleSignIn("1", bad as never)).toBe("/login?error=GoogleEmail");
  });
  it("joins a confirmed Gmail or Workspace account and keeps its password", async () => {
    await make("asha@gmail.com");
    await make("asha@shop.in");
    expect(await g.checkGoogleSignIn("1", claims("Asha@Gmail.com"))).toBe(true);
    expect(await g.checkGoogleSignIn("2", claims("asha@shop.in", { hd: "shop.in" }))).toBe(true);
    expect(await db.user.count({ where: { passwordHash: null } })).toBe(0);
  });
  it("does not join other addresses, which Google cannot vouch for", async () => {
    await make("asha@shop.in");
    expect(await g.checkGoogleSignIn("1", claims("asha@shop.in"))).toBe("/login?error=LinkFirst");
  });
  it("drops the password of someone who never confirmed the inbox", async () => {
    const u = await make("asha@gmail.com", { emailVerified: null });
    expect(await g.checkGoogleSignIn("1", claims("asha@gmail.com"))).toBe(true);
    expect(await db.user.findUnique({ where: { id: u.id } })).toMatchObject({ passwordHash: null, sessionVersion: 1 });
  });
  it("refuses disabled accounts, linked or not", async () => {
    const u = await make("asha@gmail.com", { disabledAt: new Date() });
    expect(await g.checkGoogleSignIn("1", claims("asha@gmail.com"))).toBe("/login?error=Disabled");
    await link(u.id, "1");
    expect(await g.checkGoogleSignIn("1", claims("asha@gmail.com"))).toBe("/login?error=Disabled");
  });
  it("refuses a second Google account for the same email", async () => {
    await link((await make("asha@gmail.com")).id, "1");
    expect(await g.checkGoogleSignIn("2", claims("asha@gmail.com"))).toBe("/login?error=OAuthAccountNotLinked");
  });
  it("never links to a session without the account page's permission", async () => {
    as(await make("asha@gmail.com"));
    expect(await g.checkGoogleSignIn("9", claims("other@gmail.com"))).toBe("/login?error=LinkFromAccount");
  });
  it("never links to an ended session, even with permission", async () => {
    const u = await make("asha@gmail.com");
    as(u);
    await g.startGoogleLink(u.id, PW);
    await db.user.update({ where: { id: u.id }, data: { sessionVersion: { increment: 1 } } });
    expect(await g.checkGoogleSignIn("9", claims("other@gmail.com"))).toBe("/login?error=SessionEnded");
  });
  it("links from the account page after the password", async () => {
    const u = await make("asha@shop.in");
    as(u);
    expect(await outcome(g.startGoogleLink(u.id, "wrong"))).toBe("PASSWORD");
    expect(box.jar.size).toBe(0);
    await g.startGoogleLink(u.id, PW);
    expect(box.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/api/auth" });
    expect(await g.checkGoogleSignIn("9", claims("other@gmail.com"))).toBe(true);
    // Permission belongs to that person only.
    as(await make("two@gmail.com"));
    expect(await g.checkGoogleSignIn("9", claims("other@gmail.com"))).toBe("/login?error=LinkFromAccount");
    box.jar.set("sg_google_link", `${Date.now() + 9e5}.forged`);
    expect(await g.checkGoogleSignIn("9", claims("other@gmail.com"))).toBe("/login?error=LinkFromAccount");
  });
  it("refuses a Google account that belongs to someone else", async () => {
    const me = await make("me@gmail.com");
    await link((await make("them@gmail.com")).id, "9");
    as(me);
    await g.startGoogleLink(me.id, PW);
    expect(await g.checkGoogleSignIn("9", claims("them@gmail.com"))).toBe("/login?error=OAuthAccountNotLinked");
  });
  it("disconnects with the password, but never the only way in", async () => {
    const u = await make("asha@gmail.com");
    await link(u.id, "1");
    expect(await outcome(g.unlinkGoogle(u.id, "wrong"))).toBe("PASSWORD");
    await g.unlinkGoogle(u.id, PW);
    expect(await db.account.count()).toBe(0);
    const only = await make("only@gmail.com", { passwordHash: null });
    await link(only.id, "2");
    expect(await outcome(g.unlinkGoogle(only.id, PW))).toBe("ONLY_WAY");
    expect(await db.account.count()).toBe(1);
  });
  it("shows account details without secrets", async () => {
    const u = await make("asha@gmail.com");
    expect(JSON.stringify(await g.accountDetails(u.id))).not.toMatch(/scrypt|passwordHash/);
  });
});
