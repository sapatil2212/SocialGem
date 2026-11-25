import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const url = process.env.TEST_DATABASE_URL ?? "";
const local = /^mysql:\/\/[^@]+@(127\.0\.0\.1|localhost):\d+\/\w+_test/.test(url);
const box = vi.hoisted(() => ({ codes: [] as string[], jar: new Map<string, string>(), options: {} as Record<string, unknown> }));
vi.mock("../src/server/mail", () => ({ sendCode: async (_to: string, purpose: string, code: string) => { if (purpose === "admin") box.codes.push(code); }, sendNotice: async () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (n: string) => (box.jar.has(n) ? { value: box.jar.get(n) } : undefined), set: (n: string, v: string, o: Record<string, unknown>) => { box.jar.set(n, v); box.options = o; }, delete: ({ name }: { name: string }) => box.jar.delete(name) }) }));

describe.skipIf(!local)("super admin (local MySQL)", async () => {
  if (!local) return;
  process.env.DATABASE_URL = url;
  process.env.NEXTAUTH_SECRET = "test-secret-only";
  const db = new PrismaClient({ datasourceUrl: url });
  const a = await import("../src/server/admin");
  const account = await import("../src/server/account");
  const { hashPassword } = await import("../src/server/password");
  const PW = "Filter9coffee-filter";
  const ME = "boss@example.com";
  const outcome = (p: Promise<unknown>) => p.then(() => "ok", (e) => e.code as string);
  const make = async (email: string, over = {}) => db.user.create({ data: { email, passwordHash: await hashPassword(PW), emailVerified: new Date(), ...over } });
  const login = async (email: string) => a.finishAdminLogin(await a.startAdminLogin(email, PW), box.codes.at(-1)!);

  beforeEach(async () => {
    box.codes = [];
    box.jar.clear();
    process.env.ADMIN_USER = ME;
    process.env.ADMIN_PASS = PW;
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const t of ["PublishAttempt", "PostTarget", "Post", "PostTag", "MediaAsset", "SocialAccount", "ConnectAttempt", "LedgerEntry", "WorkspaceMember", "Workspace", "BillingAccount", "VerificationToken", "RateLimit", "AuditLog", "User"]) await db.$executeRawUnsafe("DELETE FROM " + t);
  });
  afterAll(() => db.$disconnect());

  it("gives one answer for a wrong email, a wrong password and customer accounts", async () => {
    await make("plain@example.com", { isSuperAdmin: true });
    for (const [e, p] of [["plain@example.com", PW], [ME, "wrong"], [ME, `${PW} `], ["nobody@example.com", PW]]) expect(await outcome(a.startAdminLogin(e, p))).toBe("INVALID_LOGIN");
    expect(box.codes).toEqual([]);
  });
  it.each([["", PW], ["admin", PW], [ME, ""], [ME, "short-pass"]])("stays closed when the settings are missing or weak (%s)", async (user, pass) => {
    process.env.ADMIN_USER = user;
    process.env.ADMIN_PASS = pass;
    expect(await outcome(a.startAdminLogin(user, pass))).toBe("ADMIN_NOT_SET");
    expect(await a.currentAdmin()).toBeNull();
  });
  it("needs both the password and the emailed code", async () => {
    expect(await outcome(a.startAdminLogin("boss@example.com", "wrong"))).toBe("INVALID_LOGIN");
    const pending = await a.startAdminLogin("boss@example.com", PW);
    const code = box.codes.at(-1)!;
    expect(await outcome(a.finishAdminLogin(pending, String((Number(code) + 1) % 1_000_000).padStart(6, "0")))).toBe("CODE");
    expect(await a.currentAdmin()).toBeNull();
    await a.finishAdminLogin(pending, code);
    expect((await a.currentAdmin())?.email).toBe("boss@example.com");
    expect(box.options).toMatchObject({ httpOnly: true, sameSite: "strict", path: "/" });
    expect(await outcome(a.finishAdminLogin(pending, code))).toBe("CODE");
  });
  it("does not accept an admin code as a sign-up or reset code", async () => {
    const pending = await a.startAdminLogin("boss@example.com", PW);
    expect(await outcome(account.verifyEmail(pending, box.codes.at(-1)!))).toBe("CODE");
    expect(await outcome(account.resetPassword(pending, box.codes.at(-1)!, "Masala7toast!"))).toBe("CODE");
  });
  it("stores no usable token, and a made-up one fails", async () => {
    await login("boss@example.com");
    const token = box.jar.get("sg_admin")!;
    const rows = await db.verificationToken.findMany();
    expect(JSON.stringify(rows)).not.toContain(token);
    box.jar.set("sg_admin", rows[0].token);
    expect(await a.currentAdmin()).toBeNull();
  });
  it.each(["ADMIN_USER", "ADMIN_PASS"])("ends sessions and waiting codes when %s changes", async (name) => {
    await login(ME);
    await db.rateLimit.deleteMany();
    const pending = await a.startAdminLogin(ME, PW);
    process.env[name] = name === "ADMIN_USER" ? "next@example.com" : "Another-long-pass1";
    expect(await a.currentAdmin()).toBeNull();
    expect(await outcome(a.finishAdminLogin(pending, box.codes.at(-1)!))).toBe("CODE");
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
