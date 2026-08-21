import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { parseLevelUpParameters } from "@/lib/level-up";
import { saveFormulaParameters } from "@/services/formula-parameters-admin";

export async function PUT(request: Request) {
  const session = await authorizedSession("references.write");
  if (!session) return forbiddenResponse();
  const parameters = parseLevelUpParameters(
    await request.json().catch(() => null),
  );
  const numbers = [
    parameters.xp.base,
    parameters.xp.ratio,
    ...Object.values(parameters.troops).flatMap(({ coefficient, ratio }) => [
      coefficient,
      ratio,
    ]),
  ];
  if (numbers.some((value) => !Number.isFinite(value) || value <= 0))
    return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
  await saveFormulaParameters({
    calculatorSlug: "level-up",
    key: "level_up_parameters",
    label: { en: "Level Up parameters", fr: "Paramètres Level Up" },
    formulaParams: parameters,
    userId: session.user.id,
    actorRole: session.user.role,
    actorName: session.user.name ?? session.user.id,
    target: "les paramètres du référentiel Level Up",
  });
  return NextResponse.json(parameters);
}
