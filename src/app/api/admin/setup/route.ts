import { NextResponse } from "next/server";
import {
  createInitialSuperAdmin,
  hasSuperAdmin,
  SetupAlreadyCompletedError,
} from "@/services/setup-superadmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/options";
import { forbiddenResponse } from "@/auth/api-authorization";

export async function POST(request: Request) {
  // F4 (bloc de correctifs F): explicit guard first — once the platform is
  // set up, this endpoint is closed, regardless of who calls it. The
  // transaction in createInitialSuperAdmin still enforces this atomically;
  // this is the up-front, unmistakable check.
  if (await hasSuperAdmin())
    return NextResponse.json(
      { error: "setup_already_completed" },
      { status: 409 },
    );
  const session = await getServerSession(authOptions);
  if (session?.user.role === "read_only") return forbiddenResponse();
  try {
    const user = await createInitialSuperAdmin(await request.json());
    return NextResponse.json(
      { id: user.id, username: user.username },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SetupAlreadyCompletedError)
      return NextResponse.json(
        { error: "setup_already_completed" },
        { status: 409 },
      );
    return NextResponse.json({ error: "invalid_setup" }, { status: 400 });
  }
}
