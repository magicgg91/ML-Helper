import { getServerSession } from "next-auth";
import { forbidden, redirect } from "next/navigation";
import { authOptions } from "./options";
import { can, type AdminCapability } from "./permissions";
import { isAdminRole } from "./roles";
export async function requireAdminSession() {
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
export async function requireSuperAdminSession() {
  return requireCapability("users.manage");
}
