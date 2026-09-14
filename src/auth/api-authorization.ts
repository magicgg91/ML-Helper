import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./options";
import { can, type AdminCapability } from "./permissions";
import { liveSession } from "./session-freshness";

export async function authorizedSession(
  capability: AdminCapability | readonly AdminCapability[],
) {
  // E1: revalidate the live user row (active + current role) before any
  // capability check — a deactivated or demoted account is rejected here
  // even if its JWT still carries the old role.
  const session = await liveSession(await getServerSession(authOptions));
  const capabilities = Array.isArray(capability) ? capability : [capability];
  return session?.user &&
    capabilities.some((item) => can(session.user.role, item))
    ? session
    : null;
}

export async function requireApiSession() {
  // E1: the self-service profile routes (password/TOTP) gate on this alone,
  // so it must also drop a deactivated/deleted account, not just check that
  // a JWT is present.
  const session = await liveSession(await getServerSession(authOptions));
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
