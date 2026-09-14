import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { parseGemParameters } from "@/lib/gem-parameters";
import { saveFormulaParameters } from "@/services/formula-parameters-admin";

export async function PUT(request: Request) {
  // Also reachable from the Guides admin table's "Gemmes" reference row
  // (Bloc 36/A: guides_manager has references.write, no calculators.write).
  const session = await authorizedSession([
    "calculators.write",
    "references.write",
  ]);
  if (!session) return forbiddenResponse();
  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object")
    return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
  const parameters = parseGemParameters(raw);
  await saveFormulaParameters({
    calculatorSlug: "gems",
    key: "gem_parameters",
    formulaParams: parameters,
    userId: session.user.id,
    actorRole: session.user.role,
    actorName: session.user.name ?? session.user.id,
    target: "les paramètres des Gemmes",
  });
  return NextResponse.json(parameters);
}
