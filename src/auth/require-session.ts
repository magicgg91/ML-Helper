import { getServerSession } from "next-auth";
import { forbidden, redirect } from "next/navigation";
import { authOptions } from "./options";
import { can, type AdminCapability } from "./permissions";
import { isAdminRole } from "./roles";
import { hasSuperAdmin } from "../services/setup-superadmin";
export async function requireAdminSession() {
  if (!(await hasSuperAdmin())) redirect("/admin/setup");
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!isAdminRole(session.user.role)) forbidden();
  return session;
}
export async function requireCapability(capability: AdminCapability) {
  const session = await requireAdminSession();
  if (!can(session.user.role, capability)) forbidden();
  return session;
}
