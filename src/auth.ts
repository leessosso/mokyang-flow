import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { getUserByEmail, getUserByName } from "@/lib/store/users";
import { verifyPassword } from "@/lib/password";
import type { Role } from "@/lib/types";

declare module "next-auth" {
  interface User {
    role: Role;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "production" ? undefined : "dev-only-auth-secret"),
  providers: [
    Credentials({
      name: "이름 또는 이메일",
      credentials: {
        identifier: { label: "이름 또는 이메일", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const identifier = (credentials?.identifier as string | undefined)?.trim();
        const password = credentials?.password as string | undefined;
        if (!identifier || !password) return null;

        const toSessionUser = (user: {
          id: string;
          email: string;
          name: string;
          role: Role;
        }) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        });

        if (identifier.includes("@")) {
          const user = await getUserByEmail(identifier);
          if (!user) return null;
          const ok = await verifyPassword(password, user.passwordHash);
          if (!ok) return null;
          return toSessionUser(user);
        }

        const candidates = await getUserByName(identifier);
        for (const user of candidates) {
          const ok = await verifyPassword(password, user.passwordHash);
          if (ok) return toSessionUser(user);
        }
        return null;
      },
    }),
  ],
});
