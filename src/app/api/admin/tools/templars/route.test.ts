import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultTemplarPresentationCatalog } from "@/lib/templars-presentation";

const { $transaction, tx, saveFormulaParametersIn, saveReferenceTableIn } =
  vi.hoisted(() => {
    const tx = { marker: "tx" };
    return {
      tx,
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      saveFormulaParametersIn: vi.fn(),
      saveReferenceTableIn: vi.fn(),
    };
  });
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction } }));
vi.mock("@/services/formula-parameters-admin", () => ({
  saveFormulaParametersIn,
}));
vi.mock("@/services/reference-table-admin", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/reference-table-admin")
  >("@/services/reference-table-admin");
  return {
    saveReferenceTableIn,
    stringField: actual.stringField,
    numericString: actual.numericString,
  };
});

let session: { user: { id: string; role: string; name: string } } | null = {
  user: { id: "u1", role: "super_admin", name: "Alice" },
};
vi.mock("@/auth/api-authorization", () => ({
  authorizedSession: async () => session,
  forbiddenResponse: () => new Response(null, { status: 403 }),
}));

import { PUT } from "./route";

const body = (payload: unknown) =>
  new Request("http://localhost/api/admin/tools/templars", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

const validPayload = {
  parameters: { base: 150, ratio: 1.3 },
  presentation: defaultTemplarPresentationCatalog,
};

// Bloc 119 §3 bis: "Un seul enregistrement par écran… dans une seule action
// serveur transactionnelle." The Templiers screen used to save its formula
// and its presentation catalog through two routes and two buttons.
describe("PUT /api/admin/tools/templars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session = { user: { id: "u1", role: "super_admin", name: "Alice" } };
  });

  it("writes the formula and the catalog inside one transaction", async () => {
    const response = await PUT(body(validPayload));
    expect(response.status).toBe(200);
    expect($transaction).toHaveBeenCalledOnce();
    expect(saveFormulaParametersIn).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        calculatorSlug: "templars",
        key: "templar_cost",
        formulaParams: { base: 150, ratio: 1.3 },
        // Bloc 116/C: the audit sentences stay exactly the ones the two
        // routes wrote before.
        target: "templars",
        actorName: "Alice",
      }),
    );
    expect(saveReferenceTableIn).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        target: "templars-reference",
        actorName: "Alice",
      }),
    );
  });

  it("writes nothing at all when the formula is invalid", async () => {
    const response = await PUT(
      body({ ...validPayload, parameters: { base: 0, ratio: 1.3 } }),
    );
    expect(response.status).toBe(400);
    expect($transaction).not.toHaveBeenCalled();
  });

  it("writes nothing at all when a presentation row is missing", async () => {
    // Half a screen saved is exactly what the single transaction prevents.
    const partial = { ...defaultTemplarPresentationCatalog } as Record<
      string,
      unknown
    >;
    delete partial.striker;
    const response = await PUT(
      body({ ...validPayload, presentation: partial }),
    );
    expect(response.status).toBe(400);
    expect($transaction).not.toHaveBeenCalled();
  });

  it("refuses a caller with neither capability", async () => {
    session = null;
    expect((await PUT(body(validPayload))).status).toBe(403);
    expect($transaction).not.toHaveBeenCalled();
  });
});
