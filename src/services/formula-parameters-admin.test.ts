import { beforeEach, describe, expect, it, vi } from "vitest";

const { tx, $transaction, findUniqueOrThrow } = vi.hoisted(() => {
  const tx = {
    formula: { findUnique: vi.fn(), upsert: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    findUniqueOrThrow: vi.fn(),
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
});
vi.mock("../lib/prisma", () => ({
  prisma: { $transaction, calculator: { findUniqueOrThrow } },
}));

import { saveFormulaParameters } from "./formula-parameters-admin";

const input = {
  calculatorSlug: "xp-gain-rate",
  key: "tiers",
  formulaParams: { base: 10 },
  userId: "user-1",
  actorRole: "tools_manager",
  actorName: "Alice",
  target: "Gain d’XP",
};

// Bloc 93/M6: the formula write path carries the same transactional
// guarantee as saveReferenceTable and was equally untested.
describe("saveFormulaParameters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueOrThrow.mockResolvedValue({ id: "calc-1" });
    tx.formula.upsert.mockResolvedValue({ id: "formula-1" });
    tx.auditLog.create.mockResolvedValue({});
  });

  it("resolves the calculator, then writes and logs in one transaction", async () => {
    tx.formula.findUnique.mockResolvedValue(null);
    await saveFormulaParameters(input);

    expect(findUniqueOrThrow).toHaveBeenCalledWith({
      where: { slug: input.calculatorSlug },
    });
    expect($transaction).toHaveBeenCalledTimes(1);
    expect(tx.formula.upsert).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("keys the upsert on the calculator/key pair", async () => {
    tx.formula.findUnique.mockResolvedValue(null);
    await saveFormulaParameters(input);

    expect(tx.formula.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { calculatorId_key: { calculatorId: "calc-1", key: input.key } },
        create: {
          calculatorId: "calc-1",
          key: input.key,
          formulaParams: input.formulaParams,
        },
        update: { formulaParams: input.formulaParams },
      }),
    );
  });

  it("diffs against the previous parameters", async () => {
    tx.formula.findUnique.mockResolvedValue({ formulaParams: { base: 5 } });
    await saveFormulaParameters(input);

    const entry = tx.auditLog.create.mock.calls[0][0].data;
    // Always "update": a formula's parameters are edited, never created by
    // the user — the row is seeded by the calculator itself.
    expect(entry.action).toBe("update");
    expect(entry.entityType).toBe("formula");
    expect(entry.entityId).toBe("formula-1");
    expect(entry.diff).toEqual({ before: { base: 5 }, after: { base: 10 } });
    expect(entry.message).toContain(input.actorName);
    expect(entry.message).toContain(input.target);
  });

  it("diffs against null when no parameters were stored yet", async () => {
    tx.formula.findUnique.mockResolvedValue(null);
    await saveFormulaParameters(input);

    expect(tx.auditLog.create.mock.calls[0][0].data.diff).toEqual({
      before: null,
      after: input.formulaParams,
    });
  });

  it("aborts the whole save when the audit entry fails", async () => {
    tx.formula.findUnique.mockResolvedValue(null);
    tx.auditLog.create.mockRejectedValue(new Error("SQLITE_BUSY"));

    await expect(saveFormulaParameters(input)).rejects.toThrow("SQLITE_BUSY");
    expect(tx.formula.upsert).toHaveBeenCalledTimes(1);
    await expect($transaction.mock.results[0].value).rejects.toThrow(
      "SQLITE_BUSY",
    );
  });

  it("never opens a transaction for an unknown calculator", async () => {
    findUniqueOrThrow.mockRejectedValue(new Error("not found"));

    await expect(saveFormulaParameters(input)).rejects.toThrow("not found");
    expect($transaction).not.toHaveBeenCalled();
    expect(tx.formula.upsert).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
