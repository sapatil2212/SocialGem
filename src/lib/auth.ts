import type { NextAuthOptions } from "next-auth";
import type { Adapter, AdapterAccount } from "next-auth/adapters";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { googleReady } from "@/server/entry";
import { checkGoogleSignIn, googleLinked } from "@/server/google";
import { verificationRequired } from "@/server/account";
import { ensureWorkspace } from "@/server/workspaces";
import { verifyPassword } from "@/server/password";
import { allow, clientIp } from "@/server/rate-limit";
import { signInSchema } from "./auth-schemas";
import { prisma } from "./prisma";

const google = googleReady();

// Google is used to identify people only, so its tokens are never stored.
const base = PrismaAdapter(prisma) as Adapter;
const adapter: Adapter = {
  ...base,
  linkAccount: ({ userId, type, provider, providerAccountId }: AdapterAccount) => base.linkAccount!({ userId, type, provider, providerAccountId }),
};

export const authOptions: NextAuthOptions = {
  adapter,
  session: { strategy: "jwt", maxAge: 30 * 24 * 3600 },
  // No fallback secret: NextAuth refuses to run in production without one.
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login", error: "/login" },
  providers: [
    ...(google
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: { params: { prompt: "select_account", scope: "openid email profile" } },
            profile: (claims) => ({ id: claims.sub, name: claims.name?.slice(0, 80) ?? null, email: claims.email?.trim().toLowerCase() ?? null, image: claims.picture ?? null }),
            // Safe because checkGoogleSignIn decides every sign-in before anything is linked.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Email",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials, request) {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) throw new Error("InvalidLogin");
        const { email, password } = parsed.data;
        const ip = clientIp(request?.headers);
        const allowed = await Promise.all([
          allow(`login:${ip}:${email}`, 8, 900),
          allow(`login-ip:${ip}`, 60, 900),
          allow(`login-email:${email}`, 60, 900),
        ]);
        if (allowed.includes(false)) throw new Error("TooManyAttempts");

        const user = await prisma.user.findUnique({ where: { email } });
        if (!(await verifyPassword(password, user?.passwordHash)) || !user) throw new Error("InvalidLogin");
        if (!user.emailVerified && verificationRequired()) throw new Error("EmailNotVerified");
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      return checkGoogleSignIn(account.providerAccountId, profile as { email?: string; email_verified?: boolean; hd?: string });
    },
    async jwt({ token, user }) {
      const id = user?.id ?? (token.id as string | undefined);
      if (!id) return token;
      const row = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, image: true, disabledAt: true, sessionVersion: true } });
      if (!row || row.disabledAt || (!user && token.version !== row.sessionVersion)) return {};
      return { ...token, id: row.id, version: row.sessionVersion, name: row.name, email: row.email, picture: row.image };
    },
    async session({ session, token }) {
      // A revoked or deleted account has no id; every guard checks session.user.
      if (!token.id) return { ...session, user: undefined };
      return { ...session, user: { id: token.id, name: token.name, email: token.email, image: token.picture } };
    },
  },
  events: {
    // Everyone lands on a working dashboard after signing in.
    async signIn({ user }) {
      await ensureWorkspace(user.id, user.name).catch((error: Error) => console.error("[workspace]", error.name));
    },
    async linkAccount({ user, profile }) {
      const row = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true, emailVerified: true, image: true, createdAt: true } });
      if (!row) return;
      // Only an address Google itself confirmed counts as confirmed.
      const confirms = row.email?.toLowerCase() === profile.email?.toLowerCase();
      const data = { ...(!row.emailVerified && confirms && { emailVerified: new Date() }), ...(!row.image && profile.image && { image: profile.image }) };
      if (Object.keys(data).length) await prisma.user.update({ where: { id: user.id }, data });
      // Tell people who already had an account.
      if (Date.now() - row.createdAt.getTime() > 60_000) void googleLinked(row);
    },
  },
};
