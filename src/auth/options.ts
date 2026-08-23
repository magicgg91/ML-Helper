import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import {
  clearFailedLogins,
  isLoginAllowed,
  registerFailedLogin,
} from "./login-security";
import { decryptTotpSecret, verifyTotpToken } from "./totp";

const dummyPasswordHash =
  "$2b$12$o0zC4LJ5O4xjjcsEVbOFcuFFOvK/WdxyTe1DSZ6D0T7HJzAYQ4NqW";

export async function authorizeAdminCredentials(credentials?: {
  username?: string;
  password?: string;
  totp?: string;
}) {
  if (!credentials?.username || !credentials.password) return null;
  if (!(await isLoginAllowed(credentials.username))) return null;
  const user = await prisma.user.findUnique({
    where: { username: credentials.username },
  });
  const passwordMatches = await compare(
    credentials.password,
    user?.passwordHash ?? dummyPasswordHash,
  );
  const totpMatches =
    !user?.totpEnabled ||
    Boolean(
      user.totpSecretEncrypted &&
      credentials.totp &&
      verifyTotpToken(
        decryptTotpSecret(user.totpSecretEncrypted),
        credentials.totp,
      ),
    );
  if (!user || !passwordMatches || !totpMatches) {
    await registerFailedLogin(credentials.username);
    return null;
  }
  if (!user.active) {
    throw new Error("account_disabled");
  }
  await clearFailedLogins(credentials.username);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  return { id: user.id, name: user.username, role: user.role };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        totp: { label: "Authentication code", type: "text" },
      },
      authorize: authorizeAdminCredentials,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
};
