import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      const normalizeRole = (r: string | null | undefined): "BUYER" | "OPERATOR" =>
        r === "OPERATOR" ? "OPERATOR" : "BUYER";

      if (user) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        token.id = user.id;
        token.role = normalizeRole(dbUser?.role);
        token.isAdmin = dbUser?.isAdmin ?? false;
      } else if (token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email } });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = normalizeRole(dbUser.role);
          token.isAdmin = dbUser.isAdmin;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "BUYER" | "OPERATOR") ?? "BUYER";
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
};
