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
  rows: object[];
  userId: string;
  actorRole: string;
  actorName: string;
}) {
  const before = await prisma.referenceTable.findUnique({
    where: { key: args.key },
  });
  const table = await prisma.referenceTable.upsert({
    where: { key: args.key },
    create: {
      key: args.key,
      columns: args.columns,
      rows: args.rows,
    },
    update: { rows: args.rows },
  });
  await prisma.auditLog.create({
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
      diff: { before: before?.rows ?? null, after: args.rows },
    },
  });
  return table;
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
