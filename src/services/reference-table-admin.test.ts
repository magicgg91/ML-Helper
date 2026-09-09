import { beforeEach, describe, expect, it, vi } from "vitest";

const { tx, $transaction } = vi.hoisted(() => {
  const tx = {
    referenceTable: { findUnique: vi.fn(), upsert: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    // Mirrors Prisma's interactive-transaction contract closely enough for
    // these tests: the callback runs against `tx`, and a rejection propagates
    // (a real rollback additionally discards the writes, which is exactly the
    // property the atomicity test below asserts the callers rely on).
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
});
vi.mock("../lib/prisma", () => ({ prisma: { $transaction } }));

import {
  numericString,
  saveReferenceTable,
  stringField,
} from "./reference-table-admin";

const base = {
  key: "combat-equipment",
  target: "Équipements de Combat",
  columns: ["rarity", "set_name"],
  rows: [{ rarity: "Légendaire", set_name: "Spirit Fyra" }],
  userId: "user-1",
  actorRole: "references_manager",
  actorName: "Alice",
};

// Bloc 93/M6: saveReferenceTable is the single write path for every admin
// reference table (Combat, Expédition, Templiers, Gemmes, Level Up, Boutique)
// and carries the atomicity fix from the Codex review on PR #79 — yet nothing
// covered it. A regression on the transaction would have passed the whole
// suite unnoticed.
describe("saveReferenceTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.referenceTable.upsert.mockResolvedValue({ id: "table-1" });
    tx.auditLog.create.mockResolvedValue({});
  });

  it("runs the read, the upsert and the audit entry inside one transaction", async () => {
    tx.referenceTable.findUnique.mockResolvedValue({ id: "table-1", rows: [] });
    await saveReferenceTable(base);

    expect($transaction).toHaveBeenCalledTimes(1);
    // Every write went through the transaction client, never the bare one.
    expect(tx.referenceTable.findUnique).toHaveBeenCalledTimes(1);
    expect(tx.referenceTable.upsert).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("records a create when the table did not exist yet", async () => {
    tx.referenceTable.findUnique.mockResolvedValue(null);
    await saveReferenceTable(base);

    expect(tx.referenceTable.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: base.key },
        create: {
          key: base.key,
          columns: base.columns,
          rows: base.rows,
        },
        update: { rows: base.rows },
      }),
    );
    const entry = tx.auditLog.create.mock.calls[0][0].data;
    expect(entry.action).toBe("create");
    expect(entry.entityType).toBe("reference_table");
    expect(entry.entityId).toBe("table-1");
    expect(entry.userId).toBe(base.userId);
    expect(entry.actorRole).toBe(base.actorRole);
    // A creation has no previous state to diff against.
    expect(entry.diff).toEqual({ before: null, after: base.rows });
  });

  it("records an update, diffing against the previous rows", async () => {
    const previous = [{ rarity: "Rare", set_name: "Ancienne" }];
    tx.referenceTable.findUnique.mockResolvedValue({
      id: "table-1",
      rows: previous,
    });
    await saveReferenceTable(base);

    const entry = tx.auditLog.create.mock.calls[0][0].data;
    expect(entry.action).toBe("update");
    expect(entry.diff).toEqual({ before: previous, after: base.rows });
    expect(entry.message).toContain(base.actorName);
    expect(entry.message).toContain(base.target);
  });

  it("aborts the whole save when the audit entry fails", async () => {
    tx.referenceTable.findUnique.mockResolvedValue(null);
    tx.auditLog.create.mockRejectedValue(new Error("SQLITE_BUSY"));

    await expect(saveReferenceTable(base)).rejects.toThrow("SQLITE_BUSY");
    // The upsert was attempted, but inside the transaction the failure rolls
    // it back — the table must never be left updated with no audit trail.
    expect(tx.referenceTable.upsert).toHaveBeenCalledTimes(1);
    expect($transaction).toHaveBeenCalledTimes(1);
    await expect($transaction.mock.results[0].value).rejects.toThrow(
      "SQLITE_BUSY",
    );
  });

  it("propagates a failing upsert without writing an audit entry", async () => {
    tx.referenceTable.findUnique.mockResolvedValue(null);
    tx.referenceTable.upsert.mockRejectedValue(new Error("FK violation"));

    await expect(saveReferenceTable(base)).rejects.toThrow("FK violation");
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("passes a grouped object through unchanged (Boutique's 4-category shape)", async () => {
    tx.referenceTable.findUnique.mockResolvedValue(null);
    const grouped = {
      expedition: [{ name: "Torche" }],
      advisors: [],
      equipment: [],
      inventory: [],
    };
    await saveReferenceTable({ ...base, rows: grouped });

    expect(tx.referenceTable.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { rows: grouped } }),
    );
    expect(tx.auditLog.create.mock.calls[0][0].data.diff.after).toEqual(
      grouped,
    );
  });
});

describe("stringField", () => {
  it("keeps a string as-is and coerces everything else", () => {
    expect(stringField("Légendaire")).toBe("Légendaire");
    expect(stringField(12)).toBe("12");
    expect(stringField(null)).toBe("");
    expect(stringField(undefined)).toBe("");
  });
});

describe("numericString", () => {
  it("accepts an empty value and a non-negative number", () => {
    expect(numericString("")).toBe("");
    expect(numericString("  ")).toBe("");
    expect(numericString(" 12.5 ")).toBe("12.5");
    expect(numericString(0)).toBe("0");
  });

  it("rejects a negative or non-numeric value", () => {
    expect(() => numericString("-1")).toThrow("invalid number");
    expect(() => numericString("abc")).toThrow("invalid number");
  });
});
