import { prisma } from "./prisma";
import {
  equipmentStarIncrement,
  parseEquipmentStarIncrements,
  type EquipmentStarIncrements,
} from "./equipment";
import {
  applyCombatOverrides,
  combatReferenceRows,
  defaultCombatGemSlotsBase,
  defaultCombatMergeCostBase,
  defaultCombatSkydustBase,
  defaultExpeditionDismantleBase,
  defaultExpeditionMergeCostBase,
  defaultExpeditionStarIncrements,
  expeditionReferenceRows,
  parseCombatGemSlotsBase,
  parseCombatMergeCostBase,
  parseCombatSkydustBase,
  parseExpeditionDismantleBase,
  parseExpeditionMergeCostBase,
  parseExpeditionStarIncrements,
  type CombatGemSlotsBase,
  type CombatMergeCostBase,
  type CombatReferenceRow,
  type CombatSkydustBase,
  type ExpeditionDismantleBase,
  type ExpeditionMergeCostBase,
  type ExpeditionReferenceRow,
  type ExpeditionStarIncrements,
} from "./reference-equipment";

export const referenceKeys = {
  combat: "combat_equipment",
  expedition: "expedition_equipment",
  expeditionIncrements: "expedition_equipment_star_increments",
  // Bloc 75/A+B: the merged secondary tables — Combat's Fusion/Gemmes/
  // Destruction (3 rows) and Expedition's Fusion/Destruction (2 rows), each
  // row keyed by the same 5 rarities. Replaces the 5 single-metric keys
  // below, which stay only as a one-time migration read for tables saved
  // before this bloc (see getCombatSecondaryBase/getExpeditionSecondaryBase).
  combatSecondary: "combat_equipment_secondary",
  expeditionSecondary: "expedition_equipment_secondary",
  // Bloc 75/C: Combat's per-skill star increments, admin-editable now,
  // mirroring expeditionIncrements above exactly.
  combatIncrements: "combat_equipment_star_increments",
  expeditionMergeCost: "expedition_equipment_merge_cost",
  expeditionDismantle: "expedition_equipment_dismantle_terradust",
  combatSkydust: "combat_equipment_skydust",
  combatGemSlots: "combat_equipment_gem_slots",
  combatMergeCost: "combat_equipment_merge_cost",
} as const;

async function rowsFor<T>(key: string, fallback: readonly T[]): Promise<T[]> {
  const table = await prisma.referenceTable.findUnique({ where: { key } });
  return Array.isArray(table?.rows) ? (table.rows as T[]) : [...fallback];
}

export function getCombatReferenceRows(): Promise<CombatReferenceRow[]> {
  return getCombatRowsWithLegacyFallback();
}

async function getCombatRowsWithLegacyFallback(): Promise<
  CombatReferenceRow[]
> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: referenceKeys.combat },
  });
  if (Array.isArray(table?.rows)) return table.rows as CombatReferenceRow[];
  const legacy = await prisma.referenceTable.findUnique({
    where: { key: "combat_equipment_overrides" },
  });
  return Array.isArray(legacy?.rows)
    ? applyCombatOverrides(
        combatReferenceRows,
        legacy.rows as unknown as Partial<CombatReferenceRow>[],
      )
    : [...combatReferenceRows];
}

export function getExpeditionReferenceRows(): Promise<
  ExpeditionReferenceRow[]
> {
  return rowsFor(referenceKeys.expedition, expeditionReferenceRows);
}

export async function getExpeditionStarIncrements(): Promise<ExpeditionStarIncrements> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: referenceKeys.expeditionIncrements },
  });
  const stored = Array.isArray(table?.rows) ? table.rows[0] : undefined;
  return stored
    ? parseExpeditionStarIncrements(stored)
    : { ...defaultExpeditionStarIncrements };
}

// Bloc 75/C: mirrors getExpeditionStarIncrements exactly — a brand-new key,
// no legacy fallback needed (equipmentStarIncrement was hardcoded before
// this bloc, never stored).
export async function getCombatStarIncrements(): Promise<EquipmentStarIncrements> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: referenceKeys.combatIncrements },
  });
  const stored = Array.isArray(table?.rows) ? table.rows[0] : undefined;
  return stored
    ? parseEquipmentStarIncrements(stored)
    : { ...equipmentStarIncrement };
}

// Bloc 75/A: pre-Bloc-75 storage kept Combat's Pouciel merge-cost, gem-slots
// and skydust (destruction) as 3 separate 1-row tables — these 3 legacy
// readers exist only to migrate a table saved under one of those old keys,
// never used for a fresh write (see getCombatSecondaryBase below).
async function getLegacyCombatMergeCostBase(): Promise<CombatMergeCostBase> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: referenceKeys.combatMergeCost },
  });
  const stored = Array.isArray(table?.rows) ? table.rows[0] : undefined;
  return stored
    ? parseCombatMergeCostBase(stored)
    : { ...defaultCombatMergeCostBase };
}
async function getLegacyCombatGemSlotsBase(): Promise<CombatGemSlotsBase> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: referenceKeys.combatGemSlots },
  });
  const stored = Array.isArray(table?.rows) ? table.rows[0] : undefined;
  return stored
    ? parseCombatGemSlotsBase(stored)
    : { ...defaultCombatGemSlotsBase };
}
async function getLegacyCombatSkydustBase(): Promise<CombatSkydustBase> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: referenceKeys.combatSkydust },
  });
  const stored = Array.isArray(table?.rows) ? table.rows[0] : undefined;
  return stored
    ? parseCombatSkydustBase(stored)
    : { ...defaultCombatSkydustBase };
}

export type CombatSecondaryBase = {
  mergeCost: CombatMergeCostBase;
  gemSlots: CombatGemSlotsBase;
  skydust: CombatSkydustBase;
  // Bloc 76/B, fixed per Codex review on PR #94: the row's own
  // admin-editable label, stored per locale (fr/en — same convention as
  // Boutique/Templiers/Events item text: only fr/en are actually captured,
  // other locales fall back to en) rather than one literal string that
  // would otherwise override next-intl for every visitor regardless of
  // their own locale (AGENTS.md: "tout texte visible par l'utilisateur
  // passe par next-intl"). Both fr/en undefined whenever the row has never
  // been (re-)saved since Bloc 76 shipped (including the pre-Bloc-75 legacy
  // fallback below, which predates row labels entirely) — callers fall back
  // to their own locale-aware default translation in that case.
  labels?: {
    mergeCost?: { fr?: string; en?: string };
    gemSlots?: { fr?: string; en?: string };
    skydust?: { fr?: string; en?: string };
  };
};

function rowLabel(row: unknown): { fr?: string; en?: string } {
  const record = row as
    | { metric_label_fr?: unknown; metric_label_en?: unknown }
    | undefined;
  const fr =
    typeof record?.metric_label_fr === "string" && record.metric_label_fr.trim()
      ? record.metric_label_fr
      : undefined;
  const en =
    typeof record?.metric_label_en === "string" && record.metric_label_en.trim()
      ? record.metric_label_en
      : undefined;
  return { fr, en };
}

// Bloc 75/A: the 3 previously-separate admin tables (Fusion/Gemmes/
// Destruction), now genuinely merged into 1 stored table — 3 rows, fixed
// order [mergeCost, gemSlots, skydust] matching the merged admin editor and
// public table's row order. A pre-Bloc-75 install (still on the 3 old keys,
// never re-saved since) falls back to reading those instead of silently
// resetting to defaults.
export async function getCombatSecondaryBase(): Promise<CombatSecondaryBase> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: referenceKeys.combatSecondary },
  });
  const rows = Array.isArray(table?.rows) ? table.rows : null;
  if (rows && rows.length === 3) {
    return {
      mergeCost: parseCombatMergeCostBase(rows[0]),
      gemSlots: parseCombatGemSlotsBase(rows[1]),
      skydust: parseCombatSkydustBase(rows[2]),
      labels: {
        mergeCost: rowLabel(rows[0]),
        gemSlots: rowLabel(rows[1]),
        skydust: rowLabel(rows[2]),
      },
    };
  }
  const [mergeCost, gemSlots, skydust] = await Promise.all([
    getLegacyCombatMergeCostBase(),
    getLegacyCombatGemSlotsBase(),
    getLegacyCombatSkydustBase(),
  ]);
  return { mergeCost, gemSlots, skydust };
}

export async function getCombatGemSlotsBase(): Promise<CombatGemSlotsBase> {
  return (await getCombatSecondaryBase()).gemSlots;
}
export async function getCombatSkydustBase(): Promise<CombatSkydustBase> {
  return (await getCombatSecondaryBase()).skydust;
}

// Bloc 75/B: same treatment for Expedition's Fusion/Destruction (2 rows).
async function getLegacyExpeditionMergeCostBase(): Promise<ExpeditionMergeCostBase> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: referenceKeys.expeditionMergeCost },
  });
  const stored = Array.isArray(table?.rows) ? table.rows[0] : undefined;
  return stored
    ? parseExpeditionMergeCostBase(stored)
    : { ...defaultExpeditionMergeCostBase };
}
async function getLegacyExpeditionDismantleBase(): Promise<ExpeditionDismantleBase> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: referenceKeys.expeditionDismantle },
  });
  const stored = Array.isArray(table?.rows) ? table.rows[0] : undefined;
  return stored
    ? parseExpeditionDismantleBase(stored)
    : { ...defaultExpeditionDismantleBase };
}

export type ExpeditionSecondaryBase = {
  mergeCost: ExpeditionMergeCostBase;
  dismantle: ExpeditionDismantleBase;
  // Bloc 76/B: see CombatSecondaryBase.labels above — same convention.
  labels?: {
    mergeCost?: { fr?: string; en?: string };
    dismantle?: { fr?: string; en?: string };
  };
};

export async function getExpeditionSecondaryBase(): Promise<ExpeditionSecondaryBase> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: referenceKeys.expeditionSecondary },
  });
  const rows = Array.isArray(table?.rows) ? table.rows : null;
  if (rows && rows.length === 2) {
    return {
      mergeCost: parseExpeditionMergeCostBase(rows[0]),
      dismantle: parseExpeditionDismantleBase(rows[1]),
      labels: {
        mergeCost: rowLabel(rows[0]),
        dismantle: rowLabel(rows[1]),
      },
    };
  }
  const [mergeCost, dismantle] = await Promise.all([
    getLegacyExpeditionMergeCostBase(),
    getLegacyExpeditionDismantleBase(),
  ]);
  return { mergeCost, dismantle };
}
