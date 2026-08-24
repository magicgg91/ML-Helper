import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { parseXpTiers } from "@/lib/combat-calculators";
import { saveFormulaParameters } from "@/services/formula-parameters-admin";

export async function PUT(request: Request) {
  const session = await authorizedSession("calculators.write");
  if (!session) return forbiddenResponse();
  const raw = await request.json().catch(() => null);
  const tiers = parseXpTiers(raw);
  const contiguous = tiers.every((tier, index) => {
    if (index === 0 && tier.low !== 0) return false;
    if (index === tiers.length - 1) return tier.high === null;
    const next = tiers[index + 1];
    return tier.high !== null && tier.high === next.low && tier.high > tier.low;
  });
  if (!contiguous)
    return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
  await saveFormulaParameters({
    calculatorSlug: "xp-gain-rate",
    key: "xp_gain_tiers",
    formulaParams: { tiers },
    userId: session.user.id,
    actorRole: session.user.role,
    actorName: session.user.name ?? session.user.id,
    target: "les paliers du taux de gain d’XP",
  });
  return NextResponse.json({ tiers });
}
