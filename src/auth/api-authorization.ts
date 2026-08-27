import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./options";
import { can, type AdminCapability } from "./permissions";

export async function authorizedSession(
  capability: AdminCapability | readonly AdminCapability[],
) {
  const session = await getServerSession(authOptions);
  const capabilities = Array.isArray(capability) ? capability : [capability];
  return session?.user &&
    capabilities.some((item) => can(session.user.role, item))
    ? session
    : null;
}

export async function requireApiSession() {
  const session = await getServerSession(authOptions);
  return session?.user ? session : null;
}

export function forbiddenResponse() {
  return NextResponse.json(
    {
      error: "forbidden",
      message: "Ton rôle ne permet pas d’effectuer cette action.",
    },
    { status: 403 },
  );
}
