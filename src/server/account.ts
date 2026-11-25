import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { HttpError, isUniqueClash } from "./errors";
import { sendCode, sendNotice } from "./mail";
import { hashPassword, verifyPassword } from "./password";
import { allow } from "./rate-limit";

type Purpose = "verify" | "reset";
const LIFETIME = 10 * 60_000;
const MAX_TRIES = 5;

export const verificationRequired = () => process.env.AUTH_REQUIRE_EMAIL_VERIFICATION !== "false";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const newPending = () => randomBytes(24).toString("base64url");

// A six-digit code is easy to guess from a plain hash, so it is keyed with the server secret.
function seal(identifier: string, code: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is missing");
  return createHmac("sha256", secret).update(`${identifier}\n${code}`).digest("hex");
}

// `pending` ties a code to the browser that asked for it, so nobody else can use,
// guess at or cancel it, and a second sign-up cannot swap the password underneath.
const idFor = (purpose: Purpose, userId: string, pending: string) => `otp:${purpose}:${userId}:${sha(pending).slice(0, 40)}`;

async function maySend(key: string) {
  const checks = await Promise.all([allow(`otp-minute:${key}`, 1, 55), allow(`otp-hour:${key}`, 6, 3600), allow(`otp-day:${key}`, 15, 86_400)]);
  return !checks.includes(false);
}

async function requireSendAllowance(purpose: Purpose, email: string) {
  if (!(await maySend(`${purpose}:${email}`))) throw new HttpError(429, "WAIT", "Please wait a minute before asking for another code.");
}

async function deliver(work: Promise<unknown>) {
  try {
    await work;
  } catch (error) {
    console.error("[mail]", (error as { code?: string }).code ?? (error as Error).message);
    throw new HttpError(503, "MAIL", "We could not send the email. Please try again shortly.");
  }
}

async function issue(purpose: Purpose, user: { id: string; email: string }) {
  const pending = newPending();
  const identifier = idFor(purpose, user.id, pending);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // Only the newest code for a purpose works.
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: { startsWith: `otp:${purpose}:${user.id}:` } } }),
    prisma.verificationToken.create({ data: { identifier, token: seal(identifier, code), expires: new Date(Date.now() + LIFETIME) } }),
  ]);
  await deliver(sendCode(user.email, purpose, code));
  return pending;
}

async function findPending(purpose: Purpose, pending: string) {
  return prisma.verificationToken.findFirst({
    where: { identifier: { startsWith: `otp:${purpose}:`, endsWith: `:${sha(pending).slice(0, 40)}` }, expires: { gt: new Date() } },
  });
}

const wrong = () => new HttpError(400, "CODE", "That code is not right, or it has expired.");

/** Returns the user id. The count is taken before checking, and deleting is the claim, so a code works once. */
async function redeem(purpose: Purpose, pending: string, code: string) {
  if (!(await allow(`otp-try:${sha(pending)}`, MAX_TRIES, 1200))) {
    throw new HttpError(429, "TRIES", "Too many wrong codes. Ask for a new one.");
  }
  const row = await findPending(purpose, pending);
  if (!row || row.token !== seal(row.identifier, code)) throw wrong();
  const { count } = await prisma.verificationToken.deleteMany({ where: { token: row.token, expires: { gt: new Date() } } });
  if (count !== 1) throw wrong();
  return row.identifier.split(":")[2];
}

export async function register(input: { name: string; email: string; password: string }) {
  await requireSendAllowance("verify", input.email);
  const passwordHash = await hashPassword(input.password);
  const existing = await prisma.user.findUnique({ where: { email: input.email } });

  if (existing?.emailVerified) {
    // Same answer as a new sign-up, so the form does not reveal who has an account.
    await deliver(sendNotice(existing.email!, "You already have an account", "Someone tried to sign up with this address. You can log in, or reset your password from the log in page."));
    return newPending();
  }
  let user = existing;
  if (existing) {
    // Never confirmed: the newest sign-up replaces the old one, and older codes stop working.
    await prisma.verificationToken.deleteMany({ where: { identifier: { startsWith: `otp:verify:${existing.id}:` } } });
    await prisma.user.updateMany({ where: { id: existing.id, emailVerified: null }, data: { name: input.name, passwordHash, sessionVersion: { increment: 1 } } });
  } else {
    try {
      user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash } });
    } catch (error) {
      if (isUniqueClash(error)) throw new HttpError(429, "WAIT", "Please wait a minute and try again.");
      throw error;
    }
  }
  return issue("verify", { id: user!.id, email: input.email });
}

/** Someone with the right password who never entered their code. */
export async function challenge(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!(await verifyPassword(password, user?.passwordHash)) || !user?.email || user.emailVerified) {
    throw new HttpError(400, "INVALID_LOGIN", "That email and password do not match.");
  }
  await requireSendAllowance("verify", email);
  return issue("verify", { id: user.id, email: user.email });
}

export async function verifyEmail(pending: string, code: string) {
  const id = await redeem("verify", pending, code);
  const { count } = await prisma.user.updateMany({ where: { id }, data: { emailVerified: new Date() } });
  if (!count) throw wrong();
}

export async function requestReset(email: string) {
  await requireSendAllowance("reset", email);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, disabledAt: true } });
  // Always the stored address, never the one typed in.
  return user?.email && !user.disabledAt ? issue("reset", { id: user.id, email: user.email }) : newPending();
}

/** A fresh code for the same request. Unknown requests get the same answer. */
export async function resend(purpose: Purpose, pending: string) {
  const row = await findPending(purpose, pending);
  const user = row && (await prisma.user.findUnique({ where: { id: row.identifier.split(":")[2] }, select: { id: true, email: true } }));
  await requireSendAllowance(purpose, user?.email ?? `pending:${sha(pending)}`);
  return user?.email ? issue(purpose, { id: user.id, email: user.email }) : newPending();
}

export async function resetPassword(pending: string, code: string, password: string) {
  const passwordHash = await hashPassword(password);
  const id = await redeem("reset", pending, code);
  // Entering the code proves the inbox is theirs. Other sessions are signed out.
  const { count } = await prisma.user.updateMany({ where: { id }, data: { passwordHash, emailVerified: new Date(), sessionVersion: { increment: 1 } } });
  if (!count) throw wrong();
}
