import { revalidateContent } from "@/lib/revalidate-content";
import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { eventsReferenceKey } from "@/lib/events-server";
import {
  eventColors,
  eventDurations,
  maxSeasonDurationDays,
  totalEventHours,
  type EventColor,
  type EventDuration,
  type EventRow,
  type EventsCatalog,
  type EventsLeagueData,
  type EventTierRow,
} from "@/lib/events";
import { leagues } from "@/lib/player-settings";
import {
  localizedFieldOrPair,
  saveReferenceTable,
} from "@/services/reference-table-admin";
import {
  readableInEveryLocale,
  readableWhenWritten,
} from "@/lib/localized-field";

// Bloc 127 (PR 3/3) : les deux champs d'un palier passent de la paire FR/EN
// à un champ par langue. `localizedFieldOrPair` (service partagé) accepte
// encore l'ancienne charge utile : pendant la fenêtre de déploiement, un
// onglet d'administration ouvert avant la livraison envoie toujours la paire,
// et sans ce repli l'enregistrement effacerait les textes en répondant 200
// (revue Codex P1 sur la PR #167).
//
// `readableInEveryLocale` : un palier sans objectif ni récompense lisibles
// est une ligne vide dans le tableau public. L'écran les exigeait déjà — dans
// la langue ouverte, faute de mieux ; la règle devient « lisible par tout
// visiteur », c'est-à-dire écrite au moins en français ou en anglais, les
// deux langues sur lesquelles `localizedText` se replie.
function parseTier(raw: unknown): EventTierRow {
  if (!raw || typeof raw !== "object") throw new Error("invalid tier");
  const source = raw as Record<string, unknown>;
  const tier = {
    objective: localizedFieldOrPair(source, "objective"),
    reward: localizedFieldOrPair(source, "reward"),
  };
  if (!readableInEveryLocale(tier.objective))
    throw new Error("missing tier objective");
  if (!readableInEveryLocale(tier.reward))
    throw new Error("missing tier reward");
  return tier;
}

function parseDuration(raw: unknown): EventDuration {
  const value = Number(raw);
  if (!(eventDurations as readonly number[]).includes(value))
    throw new Error("invalid duration");
  return value as EventDuration;
}

// Bloc 80/F: an explicit, admin-picked color from the fixed palette
// (eventColors) — replaces Bloc 79/G's auto-derivation from the name, so
// this is now real persisted data that must be validated like duration
// above, not derived at render time.
function parseColor(raw: unknown): EventColor {
  if (!(eventColors as readonly string[]).includes(raw as string))
    throw new Error("invalid color");
  return raw as EventColor;
}

function parseEvent(raw: unknown): EventRow {
  if (!raw || typeof raw !== "object") throw new Error("invalid event");
  const source = raw as Record<string, unknown>;
  if (!Array.isArray(source.tiers)) throw new Error("invalid tiers");
  // Le nom : obligatoire, comme l'écran l'exigeait déjà — un événement sans
  // nom n'est identifiable sur aucune des deux zones publiques (le segment de
  // la frise et la tuile). La description reste facultative, donc
  // `readableWhenWritten` : vide, ou lisible par tous, jamais l'entre-deux
  // d'un texte écrit dans une seule langue et blanc pour les autres.
  const name = localizedFieldOrPair(source, "name");
  const description = localizedFieldOrPair(source, "description");
  if (!readableInEveryLocale(name)) throw new Error("missing event name");
  if (!readableWhenWritten(description))
    throw new Error("missing fallback translation");
  return {
    name,
    description,
    duration: parseDuration(source.duration),
    color: parseColor(source.color),
    tiers: source.tiers.map(parseTier),
  };
}

function parseSeasonDurationDays(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > maxSeasonDurationDays)
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
      target: "events",
      // Bloc 127 (PR 3/3) : la paire `description_fr`/`description_en` laisse
      // la place au champ unique par langue. `color` manquait déjà à cette
      // liste avant ce bloc — elle décrit le journal d'audit, pas la forme
      // enregistrée, et la corriger ici dépasserait cette PR.
      columns: [
        "seasonDurationDays",
        "name",
        "description",
        "duration",
        "tiers",
      ],
      rows: catalog,
      userId: session.user.id,
      actorRole: session.user.role,
      actorName: session.user.name ?? session.user.id,
    });
    await revalidateContent("references", "events");
    return NextResponse.json(catalog);
  } catch {
    return NextResponse.json(
      { error: "invalid_reference_rows" },
      { status: 400 },
    );
  }
}
