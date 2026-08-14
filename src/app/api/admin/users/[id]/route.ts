import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth/options";
import { deleteAdminUser, updateAdminUser } from "@/services/users";
async function actor() {
  const session = await getServerSession(authOptions);
  return session?.user.role === "super_admin" ? session : null;
}
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/admin/users/[id]">,
) {
  const session = await actor();
  if (!session)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    const user = await updateAdminUser(
      session.user.id,
      id,
      await request.json(),
    );
    return NextResponse.json({
      id: user.id,
      username: user.username,
      role: user.role,
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
  if (!session)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    await deleteAdminUser(session.user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "cannot_delete_user" }, { status: 400 });
  }
}
