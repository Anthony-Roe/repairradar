import NextAuth, { NextAuthOptions, Session, User } from "next-auth";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/shared/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (user && user.password === credentials.password) {
          return { id: user.id, email: user.email, tenantId: user.tenantId, role: user.role };
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" as const }, // Explicitly type as SessionStrategy
  pages: { signIn: "/auth/signin" },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        token.tenantId = user.tenantId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      session.user.id = token.id as string;
      session.user.tenantId = token.tenantId as string | null;
      session.user.role = token.role as string | null;
      return session;
    },  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };