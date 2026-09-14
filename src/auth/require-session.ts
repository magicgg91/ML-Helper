import { getServerSession } from "next-auth";
import { forbidden, redirect } from "next/navigation";
import { authOptions } from "./options";
import { can, type AdminCapability } from "./permissions";
import { isAdminRole } from "./roles";
import { liveSession } from "./session-freshness";
import { hasSuperAdmin } from "../services/setup-superadmin";
export async function requireAdminSession() {
  if (!(await hasSuperAdmin())) redirect("/admin/setup");
  // E1: revalidate against the live user row so a deactivated/deleted
  // account is bounced to /login and a demoted one is evaluated on its
  // current role, on the very next admin page it loads.
  const session = await liveSession(await getServerSession(authOptions));
  if (!session?.user) redirect("/login");
  if (!isAdminRole(session.user.role)) forbidden();
  return session;
}
export async function requireCapability(
  capability: AdminCapability | readonly AdminCapability[],
) {
  const session = await requireAdminSession();
  const capabilities = Array.isArray(capability) ? capability : [capability];
  if (!capabilities.some((item) => can(session.user.role, item))) forbidden();
  return session;
}
