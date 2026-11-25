import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { emailSchema } from "@/lib/auth-schemas";
import { prisma } from "@/lib/prisma";
import { HttpError, notFound } from "./errors";

// Separate from the customer session: its own cookie, a short life, and a row that can be revoked.
const secure = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");
const COOKIE = secure ? "__Host-sg_admin" : "sg_admin";
const HOURS = 4;
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
// One admin, set in the environment. ADMIN_PASS is never stored and cannot be reset by email.
export const ADMIN_ID = "env-admin";
const MIN_PASS = 14;

function credentials() {
  const email = emailSchema.safeParse(process.env.ADMIN_USER ?? "");
  const pass = process.env.ADMIN_PASS ?? "";
  return email.success && pass.length >= MIN_PASS ? { email: email.data, pass } : null;
}

const same = (a: string, b: string) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

// Sessions carry this, so changing either setting ends them all.
function stamp({ email, pass }: { email: string; pass: string }) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is missing");
  return createHmac("sha256", secret).update(JSON.stringify(["admin", email, pass])).digest("hex").slice(0, 32);
}

const audit = (actorUserId: string, action: string, entityType: string, entityId: string, change?: { before?: Prisma.InputJsonValue; after?: Prisma.InputJsonValue }) =>
  prisma.auditLog.create({ data: { actorUserId, action, entityType, entityId, ...change } });

/** Opens the admin session. A wrong email and a wrong password give the same answer. */
export async function adminLogin(email: string, password: string) {
  const admin = credentials();
  if (!admin) {
    console.error("[admin] ADMIN_USER must be an email and ADMIN_PASS at least 14 characters");
    throw new HttpError(503, "ADMIN_NOT_SET", "Admin sign-in is not set up on this server.");
  }
  const okEmail = same(email, admin.email);
  const okPass = same(password, admin.pass);
  if (!okEmail || !okPass) throw new HttpError(400, "INVALID_LOGIN", "Those details do not match an admin account.");
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + HOURS * 3_600_000);
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: { startsWith: "admin:" }, expires: { lt: new Date() } } }),
    prisma.verificationToken.create({ data: { identifier: `admin:${stamp(admin)}:${sha(token).slice(0, 16)}`, token: sha(`admin:${token}`), expires } }),
    audit(ADMIN_ID, "admin.login", "Admin", ADMIN_ID),
  ]);
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure, sameSite: "strict", path: "/", expires });
}

const row = async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 100) return null;
  return prisma.verificationToken.findFirst({ where: { token: sha(`admin:${token}`), identifier: { startsWith: "admin:" }, expires: { gt: new Date() } } });
};

/** The session and the current settings are checked on every request. */
export async function currentAdmin() {
  const session = await row();
  const admin = session && credentials();
  if (!admin || session.identifier.split(":")[1] !== stamp(admin)) return null;
  return { id: ADMIN_ID, email: admin.email };
}

export async function requireAdmin() {
  return (await currentAdmin()) ?? redirect("/admin/login");
}

export async function endAdminSession() {
  const session = await row();
  if (session) {
    await prisma.verificationToken.deleteMany({ where: { token: session.token } });
    await audit(ADMIN_ID, "admin.logout", "Admin", ADMIN_ID);
  }
  (await cookies()).delete({ name: COOKIE, path: "/", secure, httpOnly: true, sameSite: "strict" });
}

const DAY = 86_400_000;
// Days are counted in India time.
const indiaDay = (date: Date) => new Date(date.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);

export async function adminOverview() {
  const since = new Date(Date.now() - 13 * DAY);
  since.setUTCHours(0, 0, 0, 0);
  const from = new Date(since.getTime() - DAY);
  const [users, verified, disabled, workspaces, channels, targets, recent, latest] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { emailVerified: { not: null } } }),
    prisma.user.count({ where: { disabledAt: { not: null } } }),
    prisma.workspace.count({ where: { archivedAt: null } }),
    prisma.socialAccount.count({ where: { status: "ACTIVE" } }),
    prisma.postTarget.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, createdAt: true, emailVerified: true } }),
  ]);
  const perDay = new Map<string, number>();
  for (const u of recent) perDay.set(indiaDay(u.createdAt), (perDay.get(indiaDay(u.createdAt)) ?? 0) + 1);
  const signups = Array.from({ length: 14 }, (_, i) => {
    const day = indiaDay(new Date(Date.now() - (13 - i) * DAY));
    return { day, count: perDay.get(day) ?? 0 };
  });
  return { users, verified, disabled, workspaces, channels, signups, latest, targets: targets.map((t) => ({ status: t.status, count: t._count._all })) };
}

const SIZE = 20;
const pageOf = (value: unknown) => Math.min(Math.max(Number.parseInt(String(value ?? "1"), 10) || 1, 1), 5000);
const term = (value: unknown) => (typeof value === "string" ? value.trim().slice(0, 100) : "");

export async function adminUsers(query: { q?: unknown; page?: unknown }) {
  const q = term(query.q);
  const page = pageOf(query.page);
  const where: Prisma.UserWhereInput = q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] } : {};
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * SIZE, take: SIZE, select: { id: true, name: true, email: true, emailVerified: true, disabledAt: true, isSuperAdmin: true, createdAt: true, _count: { select: { memberships: true } } } }),
  ]);
  return { q, page, total, pages: Math.max(1, Math.ceil(total / SIZE)), rows };
}

export async function adminWorkspaces(query: { q?: unknown; page?: unknown }) {
  const q = term(query.q);
  const page = pageOf(query.page);
  const where: Prisma.WorkspaceWhereInput = q ? { name: { contains: q } } : {};
  const [total, rows] = await Promise.all([
    prisma.workspace.count({ where }),
    prisma.workspace.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * SIZE, take: SIZE, select: { id: true, name: true, timezone: true, archivedAt: true, createdAt: true, members: { where: { role: "OWNER" }, take: 1, select: { user: { select: { email: true } } } }, _count: { select: { members: true, accounts: true, posts: true } } } }),
  ]);
  return { q, page, total, pages: Math.max(1, Math.ceil(total / SIZE)), rows };
}

export async function adminAudit(query: { page?: unknown }) {
  const page = pageOf(query.page);
  const [total, rows] = await Promise.all([prisma.auditLog.count(), prisma.auditLog.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * SIZE, take: SIZE })]);
  const ids = [...new Set(rows.flatMap((r) => [r.actorUserId, r.entityType === "User" ? r.entityId : null]).filter((v): v is string => Boolean(v) && v !== ADMIN_ID))];
  const people = new Map((await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } })).map((u) => [u.id, u.email ?? u.id]));
  return { page, total, pages: Math.max(1, Math.ceil(total / SIZE)), rows: rows.map((r) => ({ ...r, actor: r.actorUserId === ADMIN_ID ? "Super admin" : r.actorUserId ? people.get(r.actorUserId) ?? r.actorUserId : "Server", target: r.entityId === ADMIN_ID ? "Admin area" : people.get(r.entityId) ?? r.entityId })) };
}

/** Whether things are configured. Never the values. */
export async function adminHealth() {
  const started = Date.now();
  const database = await prisma.$queryRaw`SELECT 1`.then(() => true, () => false);
  const set = (...names: string[]) => names.every((n) => Boolean(process.env[n]?.trim()));
  return {
    ms: Date.now() - started,
    checks: [
      { name: "Database", ok: database },
      { name: "Session secret", ok: set("NEXTAUTH_SECRET") },
      { name: "HTTPS address", ok: secure },
      { name: "Email sending", ok: set("EMAIL_HOST", "EMAIL_USERNAME", "EMAIL_PASSWORD") },
      { name: "MuAPI key", ok: set("MUAPI_API_KEY") || set("MUAPIAPP_API_KEY") },
      { name: "Google sign-in", ok: set("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET") },
    ],
  };
}

/** Admins are protected: nobody can disable an admin, including themselves, from the web. */
export async function setUserDisabled(actorId: string, userId: string, disabled: boolean) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, isSuperAdmin: true, disabledAt: true } });
    if (!user) throw notFound();
    if (user.isSuperAdmin) throw new HttpError(403, "ADMIN", "Admin accounts cannot be disabled here.");
    const { count } = await tx.user.updateMany({
      where: { id: userId, isSuperAdmin: false, disabledAt: disabled ? null : { not: null } },
      data: { disabledAt: disabled ? new Date() : null, sessionVersion: { increment: 1 } },
    });
    if (count) await tx.auditLog.create({ data: { actorUserId: actorId, action: disabled ? "user.disable" : "user.enable", entityType: "User", entityId: userId, before: { disabled: Boolean(user.disabledAt) }, after: { disabled } } });
    return { id: userId, disabled };
  });
}
