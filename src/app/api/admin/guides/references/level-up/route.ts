import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import {
  isSavableLevelUpParameters,
  parseLevelUpParameters,
} from "@/lib/level-up";
import { saveFormulaParameters } from "@/services/formula-parameters-admin";

export async function PUT(request: Request) {
  const session = await authorizedSession("references.write");
  if (!session) return forbiddenResponse();
  const parameters = parseLevelUpParameters(
    await request.json().catch(() => null),
  );
  if (!isSavableLevelUpParameters(parameters))
    return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
  await saveFormulaParameters({
    calculatorSlug: "level-up",
    key: "level_up_parameters",
    formulaParams: parameters,
    userId: session.user.id,
    actorRole: session.user.role,
    actorName: session.user.name ?? session.user.id,
    target: "level-up",
  });
  return NextResponse.json(parameters);
}
