import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { parseTemplarParameters } from "@/lib/templar-parameters";
import { saveFormulaParameters } from "@/services/formula-parameters-admin";

export async function PUT(request: Request) {
  const session = await authorizedSession("calculators.write");
  if (!session) return forbiddenResponse();
  const raw = await request.json().catch(() => null);
  const base = Number(raw?.base),
    ratio = Number(raw?.ratio);
  if (
    !Number.isFinite(base) ||
    base <= 0 ||
    !Number.isFinite(ratio) ||
    ratio <= 0
  )
    return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
  const parameters = parseTemplarParameters({ base, ratio });
  await saveFormulaParameters({
    calculatorSlug: "templars",
    key: "templar_cost",
    formulaParams: parameters,
    userId: session.user.id,
    actorRole: session.user.role,
    actorName: session.user.name ?? session.user.id,
    target: "les paramètres de coût des Templiers",
  });
  return NextResponse.json(parameters);
}
