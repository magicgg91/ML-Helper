import type { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { can } from "../auth/permissions";
import { prisma } from "../lib/prisma";
import { auditMessage } from "../lib/audit-message";

export function canManageReferences(session: Session | null) {
  return Boolean(session?.user && can(session.user.role, "references.write"));
}
export async function saveReferenceTable(args: {
  key: string;
  target: string;
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
}) {
  // Prisma's Json input type doesn't structurally accept a plain
  // Record<string, unknown> (its index signature isn't provably
  // InputJsonValue-shaped to the type checker) even though any JSON-safe
  // object serializes fine at runtime — this function is a thin,
  // shape-agnostic passthrough to the Json column either way.
  const rows = args.rows as Prisma.InputJsonValue;
  // Codex review (PR #79): the write and its audit-log entry must land
  // atomically — a mid-sequence Prisma failure (SQLite lock, FK violation)
  // must never leave the table updated with no audit trail. Wrapping the
  // whole read-upsert-log sequence in one transaction fixes this for every
  // caller of this shared helper (Combat/Expedition/Templars/Gems/LevelUp
  // /Boutique), not just the route that triggered the finding.
  return prisma.$transaction(async (tx) => {
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
        message: auditMessage(
          args.actorName,
          before ? "update" : "create",
          args.target,
        ),
        diff: { before: before?.rows ?? null, after: rows },
      },
    });
    return table;
  });
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
