import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { parseDemoPercentages } from "@/lib/combat-calculators";
import { saveFormulaParameters } from "@/services/formula-parameters-admin";

export async function PUT(request: Request) {
  const session = await authorizedSession("calculators.write");
  if (!session) return forbiddenResponse();
  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object")
    return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
  const percentages = parseDemoPercentages(raw);
  await saveFormulaParameters({
    calculatorSlug: "demo-attack-troops",
    key: "demo_attack_percentages",
    formulaParams: { percentages },
    userId: session.user.id,
    actorRole: session.user.role,
    actorName: session.user.name ?? session.user.id,
    target: "les pourcentages d’attaque démo",
  });
  return NextResponse.json(percentages);
}
