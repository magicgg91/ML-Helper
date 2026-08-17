import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { referenceKeys } from "@/lib/reference-equipment-server";
import { saveReferenceTable } from "@/services/reference-table-admin";

export async function PUT(request: Request) {
  const session = await authorizedSession("references.write");
  if (!session) return forbiddenResponse();
  try {
    const body = await request.json();
    if (!Array.isArray(body) || body.length !== 20)
      throw new Error("invalid rows");
    const rows = body.map((raw, index) => {
      const level = index + 1;
      const cost = Number(raw?.cost);
      if (Number(raw?.level) !== level || !Number.isFinite(cost) || cost < 0)
        throw new Error("invalid row");
      return { level, cost: Math.round(cost) };
    });
    await saveReferenceTable({
      key: referenceKeys.templars,
      label: { fr: "Coûts des Templiers", en: "Templar Costs" },
      columns: ["level", "cost"],
      rows,
      userId: session!.user.id,
      actorRole: session.user.role,
      actorName: session.user.name ?? session.user.id,
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json(
      { error: "invalid_reference_rows" },
      { status: 400 },
    );
  }
}
