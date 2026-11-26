import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const url = process.env.TEST_DATABASE_URL ?? "";
const local = /^mysql:\/\/[^@]+@(127\.0\.0\.1|localhost):\d+\/\w+_test/.test(url);
const box = vi.hoisted(() => ({ jar: new Map<string, string>(), options: {} as Record<string, unknown> }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (n: string) => (box.jar.has(n) ? { value: box.jar.get(n) } : undefined), set: (n: string, v: string, o: Record<string, unknown>) => { box.jar.set(n, v); box.options = o; }, delete: ({ name }: { name: string }) => box.jar.delete(name) }) }));

describe.skipIf(!local)("super admin (local MySQL)", async () => {
  if (!local) return;
  process.env.DATABASE_URL = url;
  process.env.NEXTAUTH_SECRET = "test-secret-only";
  const db = new PrismaClient({ datasourceUrl: url });
  const a = await import("../src/server/admin");
  const { hashPassword } = await import("../src/server/password");
  const PW = "Filter9coffee-filter";
  const ME = "boss@example.com";
  const outcome = (p: Promise<unknown>) => p.then(() => "ok", (e) => e.code as string);
  const make = async (email: string, over = {}) => db.user.create({ data: { email, passwordHash: await hashPassword(PW), emailVerified: new Date(), ...over } });
  const login = (email: string) => a.adminLogin(email, PW);

  beforeEach(async () => {
    box.jar.clear();
    process.env.ADMIN_USER = ME;
    process.env.ADMIN_PASS = PW;
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const t of ["AiUsage", "AiJob", "ContentIdea", "ContentPlan", "ContentResearch", "BrandProfile", "PublishAttempt", "PostTarget", "Post", "PostTag", "MediaAsset", "SocialAccount", "ConnectAttempt", "LedgerEntry", "WorkspaceMember", "Workspace", "BillingAccount", "VerificationToken", "RateLimit", "AuditLog", "User"]) await db.$executeRawUnsafe("DELETE FROM " + t);
  });
  afterAll(() => db.$disconnect());

  it("gives one answer for a wrong email, a wrong password and customer accounts", async () => {
    await make("plain@example.com", { isSuperAdmin: true });
    for (const [e, p] of [["plain@example.com", PW], [ME, "wrong"], [ME, `${PW} `], ["nobody@example.com", PW]]) expect(await outcome(a.adminLogin(e, p))).toBe("INVALID_LOGIN");
    expect(box.jar.size).toBe(0);
  });
  it.each([["", PW], ["admin", PW], [ME, ""], [ME, "short-pass"]])("stays closed when the settings are missing or weak (%s)", async (user, pass) => {
    process.env.ADMIN_USER = user;
    process.env.ADMIN_PASS = pass;
    expect(await outcome(a.adminLogin(user, pass))).toBe("ADMIN_NOT_SET");
    expect(await a.currentAdmin()).toBeNull();
  });
  it("opens a session with the right details, in a protected cookie", async () => {
    await login(ME);
    expect((await a.currentAdmin())?.email).toBe(ME);
    expect(box.options).toMatchObject({ httpOnly: true, sameSite: "strict", path: "/" });
  });
  it("stores no usable token, and a made-up one fails", async () => {
    await login("boss@example.com");
    const token = box.jar.get("sg_admin")!;
    const rows = await db.verificationToken.findMany();
    expect(JSON.stringify(rows)).not.toContain(token);
    box.jar.set("sg_admin", rows[0].token);
    expect(await a.currentAdmin()).toBeNull();
  });
  it.each(["ADMIN_USER", "ADMIN_PASS"])("ends sessions when %s changes", async (name) => {
    await login(ME);
    process.env[name] = name === "ADMIN_USER" ? "next@example.com" : "Another-long-pass1";
    expect(await a.currentAdmin()).toBeNull();
  });
  it("expires, and logging out revokes the stored session", async () => {
    await login("boss@example.com");
    const token = box.jar.get("sg_admin")!;
    await a.endAdminSession();
    box.jar.set("sg_admin", token);
    expect(await a.currentAdmin()).toBeNull();
    await db.rateLimit.deleteMany();
    await login("boss@example.com");
    await db.verificationToken.updateMany({ data: { expires: new Date(Date.now() - 1000) } });
    expect(await a.currentAdmin()).toBeNull();
  });
  it("disables and enables people with a record, but never admins", async () => {
    const boss = await make("boss@example.com", { isSuperAdmin: true });
    const other = await make("two@example.com", { isSuperAdmin: true });
    const person = await make("person@example.com");
    for (const id of [boss.id, other.id]) expect(await outcome(a.setUserDisabled(boss.id, id, true))).toBe("ADMIN");
    await a.setUserDisabled(a.ADMIN_ID, person.id, true);
    const after = await db.user.findUniqueOrThrow({ where: { id: person.id } });
    expect(after.disabledAt).not.toBeNull();
    expect(after.sessionVersion).toBe(1);
    await a.setUserDisabled(boss.id, person.id, false);
    expect((await db.auditLog.findMany({ orderBy: { createdAt: "asc" } })).map((r) => r.action).sort()).toEqual(["user.disable", "user.enable"]);
  });
  it("lists without ever returning password hashes", async () => {
    await make("boss@example.com", { isSuperAdmin: true });
    const out = JSON.stringify([await a.adminOverview(), await a.adminUsers({ q: "boss", page: "-4" }), await a.adminWorkspaces({}), await a.adminAudit({ page: "x" }), await a.adminHealth()]);
    expect(out).toContain("boss@example.com");
    expect(out).not.toMatch(/scrypt|passwordHash|test-secret-only|Filter9coffee/);
  });
});
