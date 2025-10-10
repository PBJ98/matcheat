import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: "Email-only",
      credentials: { email: { label: "Email", type: "text" } },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        if (!email) return null;
        // Upsert user by email (no password, demo only)
        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email }
        });
        return { id: user.id, email: user.email, name: user.name || null };
      }
    })
  ],
  pages: { signIn: "/signin" }
}
