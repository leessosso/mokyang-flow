import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "production" ? undefined : "dev-only-auth-secret"),
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isLogin = request.nextUrl.pathname.startsWith("/login");
      const isSortingHat = request.nextUrl.pathname.startsWith("/sorting-hat");
      if (!isLoggedIn && !isLogin && !isSortingHat) return false;
      if (isLoggedIn && isLogin) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && token.role) {
        session.user.id = token.id as string;
        session.user.role = token.role as import("@/lib/types").Role;
      }
      return session;
    },
  },
};
