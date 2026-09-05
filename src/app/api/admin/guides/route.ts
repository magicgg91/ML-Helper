import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { canPerformGuideAction } from "@/auth/guide-actions";
import { createGuide, isUniqueConflict } from "@/services/guides";

export async function POST(request: Request) {
  const session = await authorizedSession("guides.write");
  if (!session || !canPerformGuideAction(session.user.role, "create"))
    return forbiddenResponse();
  try {
    const guide = await createGuide(
      {
        id: session.user.id,
        name: session.user.name ?? session.user.id,
        role: session.user.role,
      },
      await request.json(),
    );
    return NextResponse.json({ id: guide.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: isUniqueConflict(error)
          ? "slug_already_exists"
          : "invalid_guide",
      },
      { status: isUniqueConflict(error) ? 409 : 400 },
    );
  }
}
