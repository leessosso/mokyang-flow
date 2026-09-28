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
      const path = request.nextUrl.pathname;
      const isLogin = path === "/login";
      const isChangePassword = path === "/change-password";
      const isSortingHat = path.startsWith("/sorting-hat");
      const isPwaPublic =
        path === "/manifest.webmanifest" ||
        path === "/firebase-messaging-sw.js" ||
        path === "/favicon.png" ||
        path === "/favicon.ico" ||
        path.startsWith("/icons/");

      if (!isLoggedIn && !isLogin && !isChangePassword && !isSortingHat && !isPwaPublic) {
        return false;
      }

      if (isLoggedIn && isLogin) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      const mustChange = auth?.user?.mustChangePassword === true;
      if (isLoggedIn && mustChange && !isChangePassword) {
        return Response.redirect(new URL("/change-password", request.nextUrl));
      }

      if (isLoggedIn && isChangePassword && !mustChange) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
      }
      if (trigger === "update" && session?.user && "mustChangePassword" in session.user) {
        token.mustChangePassword = session.user.mustChangePassword === true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && token.role) {
        session.user.id = token.id as string;
        session.user.role = token.role as import("@/lib/types").Role;
        session.user.mustChangePassword = token.mustChangePassword === true;
      }
      return session;
    },
  },
};
