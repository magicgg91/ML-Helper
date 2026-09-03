import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { eventsReferenceKey } from "@/lib/events-server";
import {
  eventDurations,
  maxSeasonDurationDays,
  totalEventHours,
  type EventDuration,
  type EventRow,
  type EventsCatalog,
  type EventsLeagueData,
  type EventTierRow,
} from "@/lib/events";
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

function parseDuration(raw: unknown): EventDuration {
  const value = Number(raw);
  if (!(eventDurations as readonly number[]).includes(value))
    throw new Error("invalid duration");
  return value as EventDuration;
}

function parseEvent(raw: unknown): EventRow {
  if (!raw || typeof raw !== "object") throw new Error("invalid event");
  const source = raw as Record<string, unknown>;
  if (!Array.isArray(source.tiers)) throw new Error("invalid tiers");
  return {
    name: stringField(source.name),
    description_fr: stringField(source.description_fr),
    description_en: stringField(source.description_en),
    duration: parseDuration(source.duration),
    tiers: source.tiers.map(parseTier),
  };
}

function parseSeasonDurationDays(raw: unknown): number {
  const value = Number(raw);
  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > maxSeasonDurationDays
  )
    throw new Error("invalid season duration");
  return value;
}

function parseLeagueData(raw: unknown): EventsLeagueData {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("invalid league data");
  const source = raw as Record<string, unknown>;
  if (!Array.isArray(source.events)) throw new Error("invalid league events");
  const seasonDurationDays = parseSeasonDurationDays(source.seasonDurationDays);
  const events = source.events.map(parseEvent);
  // Bloc 77 review (Codex PR #95): reject a schedule that overruns its own
  // season — events chain back-to-back, so anything past the season length
  // would push the timeline (Bloc 77/D) past 100%.
  if (totalEventHours(events) > seasonDurationDays * 24)
    throw new Error("events overrun season duration");
  return { seasonDurationDays, events };
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
      leagues.map((league) => [league, parseLeagueData(source[league])]),
    ) as EventsCatalog;
    await saveReferenceTable({
      key: eventsReferenceKey,
      target: "le référentiel Événements",
      columns: [
        "seasonDurationDays",
        "name",
        "description_fr",
        "description_en",
        "duration",
        "tiers",
      ],
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
