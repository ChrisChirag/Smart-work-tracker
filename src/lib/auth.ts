import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Comma-separated list of allowed emails, e.g. "a@gmail.com,b@gmail.com"
const allowedEmails: Set<string> = new Set(
  (process.env.ALLOWED_EMAILS ?? process.env.ALLOWED_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },

  callbacks: {
    async signIn({ user }) {
      if (allowedEmails.size === 0) return true; // no restriction if env var is unset
      return allowedEmails.has((user.email ?? "").toLowerCase());
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as typeof session.user & { id: string }).id = token.sub;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
  },
};
