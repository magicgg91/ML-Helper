import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, update, auditCreate, $transaction, revalidateContent } =
  vi.hoisted(() => {
    const update = vi.fn(
      async ({ data }: { data: { description: unknown } }) => ({
        description: data.description,
      }),
    );
    const auditCreate = vi.fn();
    return {
      findUnique: vi.fn(),
      update,
      auditCreate,
      $transaction: vi.fn(
        async (
          callback: (client: {
            calculator: { update: typeof update };
            auditLog: { create: typeof auditCreate };
          }) => unknown,
        ) =>
          callback({
            calculator: { update },
            auditLog: { create: auditCreate },
          }),
      ),
      revalidateContent: vi.fn(),
    };
  });
vi.mock("@/lib/prisma", () => ({
  prisma: { calculator: { findUnique }, $transaction },
}));
vi.mock("@/lib/revalidate-content", () => ({ revalidateContent }));

let capabilityAsked: string | undefined;
let allowed = true;
vi.mock("@/auth/api-authorization", () => ({
  authorizedSession: async (capability: string) => {
    capabilityAsked = capability;
    return allowed
      ? { user: { id: "u1", role: "super_admin", name: "Alice" } }
      : null;
  },
  forbiddenResponse: () => new Response(null, { status: 403 }),
}));

import { PATCH } from "./route";

/** The route reads its slug from the URL segment, like every admin route. */
const patch = (slug: string, description: unknown) =>
  PATCH(
    new Request(`http://localhost/api/admin/calculators/${slug}/description`, {
      method: "PATCH",
      body: JSON.stringify({ description }),
    }),
    {
      params: Promise.resolve({ slug }),
    } as RouteContext<"/api/admin/calculators/[slug]/description">,
  );

/** What the row held before the call. */
const stored = (description: Record<string, string>) =>
  findUnique.mockResolvedValue({ slug: "city-cost", description });

const written = () => update.mock.calls[0]?.[0]?.data.description;

beforeEach(() => {
  vi.clearAllMocks();
  capabilityAsked = undefined;
  allowed = true;
  stored({});
});

describe("PATCH /api/admin/calculators/[slug]/description", () => {
  // Codex review on PR #151: the route accepts a partial body (that is what
  // `z.partialRecord` is for), so it has to honour one. It used to store
  // only what the body carried, and `toolDescriptionToStore` reads every
  // launch locale — so the four languages a one-language call never
  // mentioned came out blank and were dropped from the row.
  describe("a partial body changes only the languages it carries", () => {
    it("leaves the other languages as it found them", async () => {
      stored({ fr: "Le prix.", en: "The cost.", de: "Der Preis." });
      const response = await patch("city-cost", { fr: "Le coût d’une ville." });
      expect(response.status).toBe(200);
      expect(written()).toEqual({
        fr: "Le coût d’une ville.",
        en: "The cost.",
        de: "Der Preis.",
      });
    });

    it("adds a language to a record that had none of it", async () => {
      stored({ fr: "Le prix." });
      await patch("city-cost", { tr: "Bir şehrin fiyatı." });
      expect(written()).toEqual({ fr: "Le prix.", tr: "Bir şehrin fiyatı." });
    });

    it("clears the language it sends blank, and only that one", async () => {
      // Blank is how the panel says "I emptied this field": explicit, so it
      // clears — unlike an omitted language, which is silence.
      stored({ fr: "Le prix.", en: "The cost." });
      await patch("city-cost", { en: "   " });
      expect(written()).toEqual({ fr: "Le prix." });
    });
  });

  it("stores exactly what a full body says, blanks included", async () => {
    // What the panel sends on every save: all five languages, so the body is
    // the whole truth and a blank one is a deletion.
    stored({ fr: "Le prix.", en: "The cost.", es: "El precio." });
    await patch("city-cost", {
      fr: "Le prix.",
      en: "",
      de: "Der Preis.",
      es: "",
      tr: "",
    });
    expect(written()).toEqual({ fr: "Le prix.", de: "Der Preis." });
  });

  it("logs which languages the description now carries, not the sentences", async () => {
    stored({ fr: "Le prix." });
    await patch("city-cost", { de: "Der Preis." });
    const entry = auditCreate.mock.calls[0]?.[0]?.data;
    expect(entry.diff).toEqual({
      before: { locales: ["fr"] },
      after: { locales: ["de", "fr"] },
    });
    expect(JSON.stringify(entry.diff)).not.toContain("Le prix");
    expect(entry.entityType).toBe("tool");
  });

  // Bloc 86/M1: one route, two capabilities — the same frontier the two
  // visibility routes draw between a tool and a reference.
  it("asks for the capability the row belongs to", async () => {
    await patch("city-cost", { fr: "Le prix." });
    expect(capabilityAsked).toBe("calculators.write");
    await patch("gemmes", { fr: "Les gemmes." });
    expect(capabilityAsked).toBe("references.write");
    expect(auditCreate.mock.calls.at(-1)?.[0]?.data.entityType).toBe(
      "reference_table",
    );
  });

  it("writes nothing for a role without that capability", async () => {
    allowed = false;
    expect((await patch("city-cost", { fr: "Le prix." })).status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses a language the site does not ship", async () => {
    expect((await patch("city-cost", { jp: "はい" })).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses a description longer than one line", async () => {
    const response = await patch("city-cost", { fr: "x".repeat(181) });
    expect(response.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("says so when the slug names no row", async () => {
    findUnique.mockResolvedValue(null);
    expect((await patch("nothing", { fr: "Le prix." })).status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("drops the public pages of the row it changed from the cache", async () => {
    await patch("city-cost", { fr: "Le prix." });
    expect(revalidateContent).toHaveBeenCalledWith("tools", "city-cost");
  });
});
