import { NextResponse } from "next/server";
import {
  createInitialSuperAdmin,
  SetupAlreadyCompletedError,
} from "@/services/setup-superadmin";

export async function POST(request: Request) {
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
