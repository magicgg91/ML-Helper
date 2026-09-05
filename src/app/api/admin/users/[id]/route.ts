import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { deleteAdminUser, updateAdminUser } from "@/services/users";
async function actor() {
  return authorizedSession("users.manage");
}
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/admin/users/[id]">,
) {
  const session = await actor();
  if (!session) return forbiddenResponse();
  try {
    const { id } = await params;
    const user = await updateAdminUser(
      session.user.id,
      session.user.role,
      id,
      await request.json(),
    );
    return NextResponse.json({
      id: user.id,
      username: user.username,
      role: user.role,
      active: user.active,
    });
  } catch {
    return NextResponse.json({ error: "invalid_user" }, { status: 400 });
  }
}
export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/admin/users/[id]">,
) {
  const session = await actor();
  if (!session) return forbiddenResponse();
  try {
    const { id } = await params;
    await deleteAdminUser(session.user.id, session.user.role, id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "cannot_delete_user" }, { status: 400 });
  }
}
