import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { parseCityParameters } from "@/lib/city-parameters";
import { saveFormulaParameters } from "@/services/formula-parameters-admin";

export async function PUT(request: Request) {
  const session = await authorizedSession("calculators.write");
  if (!session) return forbiddenResponse();
  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object") return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
  const parameters = parseCityParameters(raw);
  if (Object.values(parameters).some((item) => typeof item !== "object")) return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
  await saveFormulaParameters({ calculatorSlug: "city-cost", key: "city_parameters", label: { en: "Shared city parameters", fr: "Paramètres Villes partagés" }, formulaParams: parameters, userId: session.user.id, actorRole: session.user.role, actorName: session.user.name ?? session.user.id, target: "les paramètres partagés des outils Villes" });
  return NextResponse.json(parameters);
}

