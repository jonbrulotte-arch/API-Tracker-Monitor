import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { z } from "zod";
import { checkRateLimit } from "./rate-limit";

if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error("AUTH_SECRET must be set and at least 32 characters long");
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // 10 attempts per email per 15 minutes
        if (!checkRateLimit(`login:${parsed.data.email.toLowerCase()}`, 10, 15 * 60_000)) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.password) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        // Block disabled accounts at login
        if (user.status === "DISABLED") return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "MEMBER";
        token.status = (user as { status?: string }).status ?? "ACTIVE";
        token.statusCheckedAt = Date.now();
        return token;
      }

      // Re-validate user status every 5 minutes so disabled accounts
      // are blocked promptly without a DB call on every request.
      const CHECK_INTERVAL_MS = 5 * 60 * 1000;
      if (
        token.id &&
        typeof token.statusCheckedAt === "number" &&
        Date.now() - token.statusCheckedAt >= CHECK_INTERVAL_MS
      ) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: { status: true, role: true },
          });
          token.status = dbUser?.status ?? "DISABLED";
          token.role = dbUser?.role ?? (token.role as string);
          token.statusCheckedAt = Date.now();
        } catch {
          // Keep existing values if DB is temporarily unreachable
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
      }
      return session;
    },
  },
});
