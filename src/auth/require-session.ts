import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./options";
export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return session;
}
export async function requireSuperAdminSession() {
  const session = await requireAdminSession();
  if (session.user.role !== "super_admin") redirect("/admin");
  return session;
}
