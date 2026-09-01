import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { eventsReferenceKey } from "@/lib/events-server";
import type { EventRow, EventsCatalog, EventTierRow } from "@/lib/events";
import { leagues } from "@/lib/player-settings";
import { saveReferenceTable, stringField } from "@/services/reference-table-admin";

function parseTier(raw: unknown): EventTierRow {
  if (!raw || typeof raw !== "object") throw new Error("invalid tier");
  const source = raw as Record<string, unknown>;
  return {
    objective_fr: stringField(source.objective_fr),
    objective_en: stringField(source.objective_en),
    reward_fr: stringField(source.reward_fr),
    reward_en: stringField(source.reward_en),
  };
}

function parseEvent(raw: unknown): EventRow {
  if (!raw || typeof raw !== "object") throw new Error("invalid event");
  const source = raw as Record<string, unknown>;
  if (!Array.isArray(source.tiers)) throw new Error("invalid tiers");
  return {
    name: stringField(source.name),
    startDay: stringField(source.startDay),
    endDay: stringField(source.endDay),
    tiers: source.tiers.map(parseTier),
  };
}

function parseEvents(rawEvents: unknown): EventRow[] {
  if (!Array.isArray(rawEvents)) throw new Error("invalid league events");
  return rawEvents.map(parseEvent);
}

export async function PUT(request: Request) {
  const session = await authorizedSession("references.write");
  if (!session) return forbiddenResponse();
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("invalid catalog");
    const source = body as Record<string, unknown>;
    const catalog: EventsCatalog = Object.fromEntries(
      leagues.map((league) => [league, parseEvents(source[league])]),
    ) as EventsCatalog;
    await saveReferenceTable({
      key: eventsReferenceKey,
      target: "le référentiel Événements",
      columns: ["name", "startDay", "endDay", "tiers"],
      rows: catalog,
      userId: session.user.id,
      actorRole: session.user.role,
      actorName: session.user.name ?? session.user.id,
    });
    return NextResponse.json(catalog);
  } catch {
    return NextResponse.json({ error: "invalid_reference_rows" }, { status: 400 });
  }
}
