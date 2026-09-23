import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  auditMessage,
  auditMessageColumns,
  type AuditTarget,
} from "../lib/audit-message";

export async function saveFormulaParameters(input: {
  calculatorSlug: string;
  key: string;
  formulaParams: Prisma.InputJsonValue;
  userId: string;
  actorRole: string;
  actorName: string;
  /** Bloc 116/C: the slug half of the audit sentence's key, not a phrase. */
  target: AuditTarget;
}) {
  const calculator = await prisma.calculator.findUniqueOrThrow({
    where: { slug: input.calculatorSlug },
  });
  return prisma.$transaction(async (tx) => {
    const before = await tx.formula.findUnique({
      where: {
        calculatorId_key: { calculatorId: calculator.id, key: input.key },
      },
    });
    const formula = await tx.formula.upsert({
      where: {
        calculatorId_key: { calculatorId: calculator.id, key: input.key },
      },
      create: {
        calculatorId: calculator.id,
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
  });
}
