import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const url = process.env.TEST_DATABASE_URL ?? "";
const local = /^mysql:\/\/[^@]+@(127\.0\.0\.1|localhost):\d+\/\w+_test/.test(url);

const mail = vi.hoisted(() => ({ codes: [] as { to: string; purpose: string; code: string }[], notices: [] as string[], fail: false }));
vi.mock("../src/server/mail", () => ({
  sendCode: async (to: string, purpose: string, code: string) => {
    if (mail.fail) throw new Error("down");
    mail.codes.push({ to, purpose, code });
  },
  sendNotice: async (to: string) => {
    mail.notices.push(to);
  },
}));

describe.skipIf(!local)("email codes (local MySQL)", async () => {
  if (!local) return;
  process.env.DATABASE_URL = url;
  process.env.NEXTAUTH_SECRET = "test-secret-only";
  const db = new PrismaClient({ datasourceUrl: url });
  const a = await import("../src/server/account");
  const { verifyPassword } = await import("../src/server/password");
  const { ensureWorkspace } = await import("../src/server/workspaces");
  const EMAIL = "new@example.com", PW = "Filter9coffee", PW2 = "Masala7toast!";
  const code = () => mail.codes.at(-1)!.code;
  const other = (c: string) => String((Number(c) + 1) % 1_000_000).padStart(6, "0");
  const outcome = (p: Promise<unknown>) => p.then(() => "ok", (e) => e.code as string);
  const reg = (over = {}) => a.register({ name: "Asha", email: EMAIL, password: PW, ...over });
  const nextMinute = () => db.rateLimit.deleteMany({});
  const user = () => db.user.findUnique({ where: { email: EMAIL } });

  beforeEach(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mail.codes = [];
    mail.notices = [];
    mail.fail = false;
    for (const t of ["AiUsage", "AiJob", "ContentIdea", "ContentPlan", "ContentResearch", "BrandProfile", "PublishAttempt", "PostTarget", "Post", "PostTag", "MediaAsset", "SocialAccount", "ConnectAttempt", "LedgerEntry", "WorkspaceMember", "Workspace", "BillingAccount", "VerificationToken", "RateLimit", "User"]) await db.$executeRawUnsafe("DELETE FROM " + t);
  });
  afterAll(() => db.$disconnect());

  it("confirms with the right code, once", async () => {
    const pending = await reg();
    expect(code()).toMatch(/^\d{6}$/);
    expect((await user())!.emailVerified).toBeNull();
    expect(await outcome(a.verifyEmail(pending, other(code())))).toBe("CODE");
    expect(await outcome(a.verifyEmail(pending, code()))).toBe("ok");
    expect((await user())!.emailVerified).not.toBeNull();
    expect(await outcome(a.verifyEmail(pending, code()))).toBe("CODE");
  });
  it("only one of two simultaneous uses wins", async () => {
    const pending = await reg();
    const r = await Promise.all([outcome(a.verifyEmail(pending, code())), outcome(a.verifyEmail(pending, code()))]);
    expect(r.sort()).toEqual(["CODE", "ok"]);
  });
  it("stores neither the code nor the pending key", async () => {
    const pending = await reg();
    const [row] = await db.verificationToken.findMany();
    expect(JSON.stringify(row)).not.toContain(code());
    expect(JSON.stringify(row)).not.toContain(pending);
    expect(row.token).toMatch(/^[0-9a-f]{64}$/);
  });
  it("locks after five wrong tries, even with the right code", async () => {
    const pending = await reg();
    for (let i = 0; i < 5; i++) expect(await outcome(a.verifyEmail(pending, other(code())))).toBe("CODE");
    expect(await outcome(a.verifyEmail(pending, code()))).toBe("TRIES");
  });
  it("parallel guessing never gets more than five tries", async () => {
    const pending = await reg();
    const r = await Promise.all(Array.from({ length: 15 }, () => outcome(a.verifyEmail(pending, other(code())))));
    expect(r.filter((x) => x === "CODE").length).toBeLessThanOrEqual(5);
  });
  it("a code works only in the browser that asked", async () => {
    await reg();
    expect(await outcome(a.verifyEmail("x".repeat(32), code()))).toBe("CODE");
  });
  it("expires", async () => {
    const pending = await reg();
    await db.verificationToken.updateMany({ data: { expires: new Date(0) } });
    expect(await outcome(a.verifyEmail(pending, code()))).toBe("CODE");
  });
  it("a sign-up code cannot reset a password", async () => {
    const pending = await reg();
    expect(await outcome(a.resetPassword(pending, code(), PW2))).toBe("CODE");
  });
  it("limits how often codes are sent", async () => {
    await reg();
    expect(await outcome(reg())).toBe("WAIT");
    expect(mail.codes).toHaveLength(1);
  });
  it("resending replaces the old code", async () => {
    const first = await reg();
    const old = code();
    await nextMinute();
    const second = await a.resend("verify", first);
    expect(second).not.toBe(first);
    expect(await outcome(a.verifyEmail(first, old))).toBe("CODE");
    expect(await outcome(a.verifyEmail(second, code()))).toBe("ok");
  });
  it("a hostile second sign-up cannot plant a password", async () => {
    const victim = await reg({ password: PW });
    const victimCode = code();
    await nextMinute();
    await reg({ password: "Attacker9pass" });
    const attackerCode = code();
    // The victim still holds the first browser key, and only the victim reads the inbox.
    expect(await outcome(a.verifyEmail(victim, victimCode))).toBe("CODE");
    expect(await outcome(a.verifyEmail(victim, attackerCode))).toBe("CODE");
    expect((await user())!.emailVerified).toBeNull();
  });
  it("an existing account looks the same and is left alone", async () => {
    await a.verifyEmail(await reg(), code());
    const before = await user();
    await nextMinute();
    const pending = await reg({ password: "Attacker9pass", name: "X" });
    expect(pending).toHaveLength(32);
    expect(mail.notices).toEqual([EMAIL]);
    expect(await user()).toEqual(before);
    expect(await outcome(a.verifyEmail(pending, "000000"))).toBe("CODE");
  });
  it("resets the password with a code and ends other sessions", async () => {
    await a.verifyEmail(await reg(), code());
    const before = (await user())!.sessionVersion;
    const pending = await a.requestReset(EMAIL);
    expect(mail.codes.at(-1)!.purpose).toBe("reset");
    expect(await outcome(a.resetPassword(pending, code(), PW2))).toBe("ok");
    const now = (await user())!;
    expect(now.sessionVersion).toBe(before + 1);
    expect(await verifyPassword(PW2, now.passwordHash)).toBe(true);
    expect(await verifyPassword(PW, now.passwordHash)).toBe(false);
  });
  it("does not reveal unknown emails on reset", async () => {
    const pending = await a.requestReset("nobody@example.com");
    expect(pending).toHaveLength(32);
    expect(mail.codes).toHaveLength(0);
    expect(await outcome(a.resetPassword(pending, "123456", PW2))).toBe("CODE");
    expect(await outcome(a.requestReset("nobody@example.com"))).toBe("WAIT");
  });
  it("lets someone with the right password get a new code", async () => {
    await reg();
    await nextMinute();
    expect(await outcome(a.challenge(EMAIL, "Wrong9password"))).toBe("INVALID_LOGIN");
    expect(await outcome(a.verifyEmail(await a.challenge(EMAIL, PW), code()))).toBe("ok");
    await nextMinute();
    expect(await outcome(a.challenge(EMAIL, PW))).toBe("INVALID_LOGIN");
  });
  it("says so when email cannot be sent", async () => {
    mail.fail = true;
    expect(await outcome(reg())).toBe("MAIL");
  });
  it("makes one first workspace even for two sign-ins at once", async () => {
    await reg();
    const u = (await user())!;
    await Promise.all([ensureWorkspace(u.id, u.name), ensureWorkspace(u.id, u.name), ensureWorkspace(u.id, u.name)]);
    expect((await db.workspace.findMany()).map((w) => w.name)).toEqual(["Asha's brand"]);
  });
});

it("account mail never uses EMAIL_BCC", async () => {
  const { readFileSync } = await import("node:fs");
  expect(readFileSync("src/server/mail.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/bcc/i);
});
