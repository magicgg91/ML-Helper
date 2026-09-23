import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import frMessages from "../../messages/fr.json";
import enMessages from "../../messages/en.json";
import {
  auditMessage,
  auditMessageColumns,
  auditTargets,
  auditTranslator,
  parseAuditParams,
  renderAuditMessage,
} from "./audit-message";

/** The real next-intl translator, over the real message files. */
const translatorFor = (locale: "fr" | "en") =>
  auditTranslator(
    createTranslator({
      locale,
      messages: locale === "fr" ? frMessages : enMessages,
      namespace: "admin.logs.messages",
    }),
  );

/** A row as the writer would have stored it. */
const row = (message: ReturnType<typeof auditMessage>, legacy = "") => ({
  ...auditMessageColumns(message),
  legacyMessage: legacy,
});

describe("Bloc 116/C: an audit entry carries a key and its values", () => {
  it("stores the key and the parameters, not a sentence", () => {
    expect(
      auditMessageColumns(
        auditMessage("user.delete", { actor: "root", username: "toto" }),
      ),
    ).toEqual({
      messageKey: "user.delete",
      messageParams: '{"actor":"root","username":"toto"}',
    });
  });

  // The brief asks for at least 3 of the call sites, in both languages. These
  // are five, one per shape the writers use: a plain actor, an actor and a
  // named thing, a pluralised count, a slug, and a reference-table save whose
  // key is built from the target slug.
  it.each([
    [
      auditMessage("setup", { actor: "root" }),
      "root a créé le premier compte Super Admin",
      "root created the first Super Admin account",
    ],
    [
      auditMessage("user.delete", { actor: "root", username: "toto" }),
      "root a supprimé l’utilisateur toto",
      "root deleted user toto",
    ],
    [
      auditMessage("guide.publish", { actor: "alice", title: "Débuter" }),
      "alice a publié le guide Débuter",
      "alice published guide Débuter",
    ],
    [
      auditMessage("tool.deactivate", { actor: "bob", slug: "city-cost" }),
      "bob a désactivé l’outil city-cost",
      "bob deactivated tool city-cost",
    ],
    [
      auditMessage("events.update", { actor: "alice" }),
      "alice a modifié le référentiel Événements",
      "alice updated the Events reference",
    ],
  ])("reads %o in both languages", (message, french, english) => {
    expect(renderAuditMessage(row(message), translatorFor("fr"))).toBe(french);
    expect(renderAuditMessage(row(message), translatorFor("en"))).toBe(english);
  });

  // A count is a plural, not a number glued to a noun.
  it.each([
    [1, "root a purgé 1 entrée du journal", "root purged 1 journal entry"],
    [
      12,
      "root a purgé 12 entrées du journal",
      "root purged 12 journal entries",
    ],
  ])("agrees the purge count for %i", (count, french, english) => {
    const message = auditMessage("logs.purge", { actor: "root", count });
    expect(renderAuditMessage(row(message), translatorFor("fr"))).toBe(french);
    expect(renderAuditMessage(row(message), translatorFor("en"))).toBe(english);
  });

  // Every sentence a writer can produce has to exist in both files, or an
  // admin reads a bare key where a sentence belongs.
  it("has both languages for every target a save can name", () => {
    for (const target of auditTargets)
      for (const action of ["create", "update"] as const) {
        const key = `${target}.${action}`;
        // Parameter sets are only ever updated; tables can also be created.
        if (!translatorFor("fr").has(key)) continue;
        expect(
          translatorFor("en").has(key),
          `${key} is missing in English`,
        ).toBe(true);
      }
  });

  it("names a target for every reference and parameter save in the app", () => {
    // auditTargets is what the two services accept; a slug missing from it
    // would not compile, and one left in it with no sentence would render as
    // a bare key.
    for (const target of auditTargets) {
      const updatable = translatorFor("fr").has(`${target}.update`);
      expect(updatable, `${target}.update has no sentence`).toBe(true);
    }
  });
});

describe("Bloc 116/C: rendering is defensive", () => {
  it("shows the French sentence of an entry written before the change", () => {
    expect(
      renderAuditMessage(
        {
          messageKey: "",
          messageParams: "{}",
          legacyMessage: "toto a purgé 3 entrées",
        },
        translatorFor("en"),
      ),
    ).toBe("toto a purgé 3 entrées");
  });

  it("falls back to the key rather than throwing on an unknown one", () => {
    expect(
      renderAuditMessage(
        { messageKey: "nothing.here", messageParams: "{}", legacyMessage: "" },
        translatorFor("fr"),
      ),
    ).toBe("nothing.here");
  });

  it("survives params that are not readable JSON", () => {
    expect(parseAuditParams("not json")).toEqual({});
    expect(parseAuditParams("[1,2]")).toEqual({});
    expect(parseAuditParams("")).toEqual({});
  });
});
