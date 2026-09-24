import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { AdminTransaction } from "./transaction";
import {
  auditMessage,
  auditMessageColumns,
  type AuditTarget,
} from "../lib/audit-message";

export type SaveReferenceTableArgs = {
  key: string;
  /**
   * Bloc 116/C: the slug of what is being saved, which is half of the audit
   * sentence's key ("events" -> "events.create" / "events.update"). It used
   * to be the French noun phrase itself.
   */
  target: AuditTarget;
  columns: string[];
  // Bloc 48/B: Boutique's admin editor now saves 4 tables grouped in a
  // single plain object (one array per category) instead of one flat
  // array — this function is otherwise fully shape-agnostic (it only ever
  // passes rows straight through to Prisma's Json column and into the
  // audit diff), so widening the type costs existing array-based callers
  // (Combat/Expedition/etc.) nothing.
  rows: object[] | Record<string, unknown>;
  userId: string;
  actorRole: string;
  actorName: string;
};

/** The write, inside a transaction the caller owns (see saveFormulaParametersIn). */
export async function saveReferenceTableIn(
  tx: AdminTransaction,
  args: SaveReferenceTableArgs,
) {
  // Prisma's Json input type doesn't structurally accept a plain
  // Record<string, unknown> (its index signature isn't provably
  // InputJsonValue-shaped to the type checker) even though any JSON-safe
  // object serializes fine at runtime — this function is a thin,
  // shape-agnostic passthrough to the Json column either way.
  const rows = args.rows as Prisma.InputJsonValue;
  const before = await tx.referenceTable.findUnique({
    where: { key: args.key },
  });
  const table = await tx.referenceTable.upsert({
    where: { key: args.key },
    create: {
      key: args.key,
      columns: args.columns,
      rows,
    },
    update: { rows },
  });
  await tx.auditLog.create({
    data: {
      userId: args.userId,
      actorRole: args.actorRole,
      action: before ? "update" : "create",
      entityType: "reference_table",
      entityId: table.id,
      ...auditMessageColumns(
        auditMessage(`${args.target}.${before ? "update" : "create"}`, {
          actor: args.actorName,
        }),
      ),
      diff: { before: before?.rows ?? null, after: rows },
    },
  });
  return table;
}

// Codex review (PR #79): the write and its audit-log entry must land
// atomically — a mid-sequence Prisma failure (SQLite lock, FK violation) must
// never leave the table updated with no audit trail. Wrapping the whole
// read-upsert-log sequence in one transaction fixes this for every caller of
// this shared helper (Combat/Expedition/Templars/Gems/LevelUp/Boutique), not
// just the route that triggered the finding.
export async function saveReferenceTable(args: SaveReferenceTableArgs) {
  return prisma.$transaction((tx) => saveReferenceTableIn(tx, args));
}
export function stringField(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}
export function numericString(value: unknown) {
  const result = stringField(value).trim();
  if (result && (!Number.isFinite(Number(result)) || Number(result) < 0))
    throw new Error("invalid number");
  return result;
}
