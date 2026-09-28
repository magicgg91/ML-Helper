import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { AdminTransaction } from "./transaction";
import {
  auditMessage,
  auditMessageColumns,
  type AuditTarget,
} from "../lib/audit-message";

export type SaveFormulaParametersInput = {
  calculatorSlug: string;
  key: string;
  formulaParams: Prisma.InputJsonValue;
  userId: string;
  actorRole: string;
  actorName: string;
  /** Bloc 116/C: the slug half of the audit sentence's key, not a phrase. */
  target: AuditTarget;
};

/**
 * Bloc 119 §3 bis: the same write, inside a transaction the caller owns.
 *
 * The Templiers screen saves its cost formula and its presentation catalog
 * with one button, so the two writes and their two audit entries have to land
 * together or not at all — which they cannot do while each helper opens a
 * transaction of its own.
 */
export async function saveFormulaParametersIn(
  tx: AdminTransaction,
  input: SaveFormulaParametersInput,
  /**
   * Already resolved by the caller, when it could do so before opening its
   * transaction — an unknown slug should not take a write lock it can only
   * release again.
   */
  calculatorId?: string,
) {
  const id =
    calculatorId ??
    (
      await tx.calculator.findUniqueOrThrow({
        where: { slug: input.calculatorSlug },
      })
    ).id;
  const before = await tx.formula.findUnique({
    where: { calculatorId_key: { calculatorId: id, key: input.key } },
  });
  const formula = await tx.formula.upsert({
    where: { calculatorId_key: { calculatorId: id, key: input.key } },
    create: {
      calculatorId: id,
      key: input.key,
      formulaParams: input.formulaParams,
    },
    update: { formulaParams: input.formulaParams },
  });
  await tx.auditLog.create({
    data: {
      userId: input.userId,
      actorRole: input.actorRole,
      ...auditMessageColumns(
        auditMessage(`${input.target}.update`, { actor: input.actorName }),
      ),
      action: "update",
      entityType: "formula",
      entityId: formula.id,
      diff: {
        before: before?.formulaParams ?? null,
        after: input.formulaParams,
      },
    },
  });
  return formula;
}

export async function saveFormulaParameters(input: SaveFormulaParametersInput) {
  // Resolved first, and outside: a request naming a calculator that does not
  // exist never opens a transaction at all.
  const calculator = await prisma.calculator.findUniqueOrThrow({
    where: { slug: input.calculatorSlug },
  });
  return prisma.$transaction((tx) =>
    saveFormulaParametersIn(tx, input, calculator.id),
  );
}
