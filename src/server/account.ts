import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "./password";
import { sendLink } from "./mail";

type Purpose = "verify" | "reset";
const LIFETIME: Record<Purpose, number> = { verify: 24 * 3600_000, reset: 3600_000 };

export const verificationRequired = () => {
  const value = process.env.AUTH_REQUIRE_EMAIL_VERIFICATION;
  return value ? value !== "false" : process.env.NODE_ENV === "production";
};

const digest = (token: string) => createHash("sha256").update(token).digest("hex");
const baseUrl = () => (process.env.APP_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "");

// Only the hash is stored, so a database leak does not reveal working links.
async function createToken(purpose: Purpose, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const identifier = `${purpose}:${userId}`;
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({ data: { identifier, token: digest(token), expires: new Date(Date.now() + LIFETIME[purpose]) } }),
  ]);
  return token;
}

// Deleting is the claim: of two simultaneous uses, only one succeeds.
async function consumeToken(purpose: Purpose, token: string) {
  const row = await prisma.verificationToken.findUnique({ where: { token: digest(token) } });
  if (!row || !row.identifier.startsWith(`${purpose}:`)) return null;
  const { count } = await prisma.verificationToken.deleteMany({ where: { token: row.token } });
  if (count !== 1 || row.expires < new Date()) return null;
  return row.identifier.slice(purpose.length + 1);
}

export async function sendVerification(user: { id: string; email: string }) {
  const token = await createToken("verify", user.id);
  await sendLink(user.email, "Confirm your email", "Confirm this address to finish creating your SocialGem account. The link works for 24 hours.", "Confirm email", `${baseUrl()}/verify-email#${token}`);
}

export async function register(input: { name: string; email: string; password: string }) {
  const passwordHash = await hashPassword(input.password);
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    if (verificationRequired()) {
      if (existing.emailVerified) {
        await sendLink(existing.email!, "You already have an account", "Someone tried to sign up with this address. You can log in, or reset your password from the log in page.", "Log in", `${baseUrl()}/login`);
      } else {
        await sendVerification({ id: existing.id, email: existing.email! });
      }
      return "check-email" as const;
    }
    return "exists" as const;
  }
  let user;
  try {
    user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash } });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return verificationRequired() ? ("check-email" as const) : ("exists" as const);
    throw error;
  }
  if (!verificationRequired()) return "ready" as const;
  await sendVerification({ id: user.id, email: input.email });
  return "check-email" as const;
}

export async function verifyEmail(token: string) {
  const id = await consumeToken("verify", token);
  if (!id) return false;
  const { count } = await prisma.user.updateMany({ where: { id }, data: { emailVerified: new Date() } });
  return count === 1;
}

export async function requestReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.email) return;
  const token = await createToken("reset", user.id);
  // Always the stored address, never the one typed in.
  await sendLink(user.email, "Reset your password", "Choose a new password for SocialGem. The link works for one hour.", "Choose a password", `${baseUrl()}/reset-password#${token}`);
}

export async function resetPassword(token: string, password: string) {
  const passwordHash = await hashPassword(password);
  const id = await consumeToken("reset", token);
  if (!id) return false;
  // Opening the link proves the inbox is theirs. Other sessions are signed out.
  const { count } = await prisma.user.updateMany({
    where: { id },
    data: { passwordHash, emailVerified: new Date(), sessionVersion: { increment: 1 } },
  });
  return count === 1;
}
