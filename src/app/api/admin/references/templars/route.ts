import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth/options";
import { referenceKeys } from "@/lib/reference-equipment-server";
import {
  canManageReferences,
  saveReferenceTable,
} from "@/services/reference-table-admin";

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!canManageReferences(session))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const body = await request.json();
    if (!Array.isArray(body) || body.length !== 21)
      throw new Error("invalid rows");
    const rows = body.map((raw, level) => {
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
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json(
      { error: "invalid_reference_rows" },
      { status: 400 },
    );
  }
}
