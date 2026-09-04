import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

// E1 (bloc de correctifs A): the JWT freezes `role` and `active` at login
// time — NextAuth never re-reads them. Without this, deactivating,
// deleting or demoting an admin has no effect on a session already issued
// until it expires (up to 30 days). `liveSession` re-checks the live user
// row on every privileged server-side entry point so those actions take
// effect on the account's very next request, not only at re-login:
//   - user missing (deleted) or `active === false`  -> null (unauthenticated)
//   - role changed since login                      -> session with the DB role
//   - otherwise                                     -> the session unchanged
// Every guard (`authorizedSession`, `requireApiSession`, `requireAdminSession`)
// funnels through this, so the revocation is enforced uniformly.
export async function liveSession(
  session: Session | null,
): Promise<Session | null> {
  if (!session?.user?.id) return null;
  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, active: true },
  });
  if (!current || !current.active) return null;
  if (current.role === session.user.role) return session;
  return { ...session, user: { ...session.user, role: current.role } };
}
