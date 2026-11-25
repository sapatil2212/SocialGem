import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { emailSchema } from "@/lib/auth-schemas";
import { prisma } from "@/lib/prisma";
import { HttpError } from "./errors";
import { sendNotice } from "./mail";
import { verifyPassword } from "./password";

// Connecting Google to a signed-in account needs this short-lived cookie, set only
// by the account page. Without it NextAuth would link to whoever the cookie names.
const COOKIE = "sg_google_link";
const MINUTES = 10;

function sign(userId: string, sessionVersion: number, expires: number) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is missing");
  return createHmac("sha256", secret).update(JSON.stringify(["google-link", userId, sessionVersion, expires])).digest("base64url");
}

async function mayLink(userId: string, sessionVersion: number) {
  const [expires, given] = ((await cookies()).get(COOKIE)?.value ?? "").split(".");
  if (!given || !(Number(expires) > Date.now())) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(sign(userId, sessionVersion, Number(expires)));
  return a.length === b.length && timingSafeEqual(a, b);
}

const refuse = (code: string) => `/login?error=${code}`;

type Claims = { email?: string; email_verified?: boolean; hd?: string };

/** Decides every Google sign-in. Returns true, or where to send the person instead. */
export async function checkGoogleSignIn(googleId: string, claims: Claims | undefined): Promise<true | string> {
  const parsed = emailSchema.safeParse(claims?.email ?? "");
  if (!parsed.success || claims?.email_verified !== true) return refuse("GoogleEmail");
  const email = parsed.data;

  const linked = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: "google", providerAccountId: googleId } },
    select: { userId: true, user: { select: { disabledAt: true } } },
  });

  const token = await getToken({ req: { cookies: await cookies(), headers: await headers() } as unknown as NextRequest, secret: process.env.NEXTAUTH_SECRET }).catch(() => null);
  if (token?.sub) {
    // NextAuth acts on this cookie alone, so make sure the session behind it is still good.
    const me = await prisma.user.findUnique({ where: { id: token.sub }, select: { id: true, disabledAt: true, sessionVersion: true } });
    if (!me || me.disabledAt || me.sessionVersion !== token.version) return refuse("SessionEnded");
    if (linked) return linked.userId === me.id || refuse("OAuthAccountNotLinked");
    if (!(await mayLink(me.id, me.sessionVersion))) return refuse("LinkFromAccount");
    if (await prisma.account.findFirst({ where: { userId: me.id, provider: "google" }, select: { id: true } })) return refuse("AlreadyLinked");
    return true;
  }

  if (linked) return linked.user.disabledAt ? refuse("Disabled") : true;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, emailVerified: true, disabledAt: true, accounts: { where: { provider: "google" }, select: { id: true } } } });
  if (!existing) return true;
  if (existing.disabledAt) return refuse("Disabled");
  // A different Google account already opens this one.
  if (existing.accounts.length) return refuse("OAuthAccountNotLinked");
  // Google only speaks for Gmail and Workspace addresses. Others must prove the account is theirs.
  if (!claims.hd && !/@(gmail|googlemail)\.com$/.test(email)) return refuse("LinkFirst");
  if (!existing.emailVerified) {
    // Whoever made this account never proved they own the inbox. Google just did.
    await prisma.user.update({ where: { id: existing.id }, data: { passwordHash: null, emailVerified: new Date(), sessionVersion: { increment: 1 } } });
  }
  return true;
}

export const googleLinked = (user: { email?: string | null }) =>
  user.email
    ? sendNotice(user.email, "Google sign-in was added", "Google can now be used to log in to your SocialGem account. If this was not you, reset your password, then disconnect Google in Account settings.").catch((error: Error) => console.error("[mail]", error.name))
    : undefined;

/** Asks for the password again, so a borrowed screen cannot add someone else's Google account. */
export async function startGoogleLink(userId: string, password: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true, sessionVersion: true, accounts: { where: { provider: "google" }, select: { id: true } } } });
  if (user.accounts.length) throw new HttpError(409, "LINKED", "Google is already connected.");
  if (!user.passwordHash || !(await verifyPassword(password, user.passwordHash))) throw new HttpError(400, "PASSWORD", "That password is not right.");
  const expires = Date.now() + MINUTES * 60_000;
  // Lax, because Google sends the person back from another site.
  (await cookies()).set(COOKIE, `${expires}.${sign(userId, user.sessionVersion, expires)}`, { httpOnly: true, sameSite: "lax", secure: (process.env.NEXTAUTH_URL ?? "").startsWith("https://"), path: "/api/auth", expires: new Date(expires) });
  return { ready: true };
}

export async function unlinkGoogle(userId: string, password: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (!user.passwordHash) throw new HttpError(409, "ONLY_WAY", "Set a password first, or you would not be able to log in.");
  if (!(await verifyPassword(password, user.passwordHash))) throw new HttpError(400, "PASSWORD", "That password is not right.");
  await prisma.account.deleteMany({ where: { userId, provider: "google" } });
  return { google: false };
}

export async function accountDetails(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, image: true, passwordHash: true, createdAt: true, accounts: { where: { provider: "google" }, select: { id: true } } } });
  return { name: user.name ?? "", email: user.email ?? "", image: user.image, password: Boolean(user.passwordHash), google: user.accounts.length > 0 };
}

export const renameUser = (id: string, name: string) => prisma.user.update({ where: { id }, data: { name }, select: { name: true } });

export async function endSessions(id: string) {
  await prisma.user.update({ where: { id }, data: { sessionVersion: { increment: 1 } } });
  return { done: true };
}
