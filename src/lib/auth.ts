import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { verificationRequired } from "@/server/account";
import { verifyPassword } from "@/server/password";
import { allow, clientIp } from "@/server/rate-limit";
import { signInSchema } from "./auth-schemas";
import { prisma } from "./prisma";

const google = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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
            authorization: { params: { prompt: "select_account" } },
            // Safe because the signIn callback only accepts Google-verified
            // addresses and clears any password set by an unverified owner.
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
      const claims = profile as { email?: string; email_verified?: boolean } | undefined;
      if (!claims?.email || claims.email_verified !== true) return false;
      const existing = await prisma.user.findUnique({ where: { email: claims.email } });
      if (existing && !existing.emailVerified) {
        // Whoever made this account never proved they own the inbox. Google just did.
        await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash: null, emailVerified: new Date(), sessionVersion: { increment: 1 } },
        });
      }
      return true;
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
    async linkAccount({ user }) {
      await prisma.user.updateMany({ where: { id: user.id, emailVerified: null }, data: { emailVerified: new Date() } });
    },
  },
};
