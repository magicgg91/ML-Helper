import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fallbackLocale, getAvailableLocales } from "./config";
import { adminLocales, isAdminMessageKey } from "@/lib/translations";

type Messages = Record<string, unknown>;

function isMessageObject(value: unknown): value is Messages {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Every leaf key, dotted — `Public.descriptions.legal` rather than nested. */
function leafKeys(messages: Messages, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const dotted = `${prefix}${key}`;
    return isMessageObject(value) ? leafKeys(value, `${dotted}.`) : [dotted];
  });
}

async function readLocale(locale: string): Promise<Messages> {
  const raw = await readFile(
    path.join(process.cwd(), "messages", `${locale}.json`),
    "utf8",
  );
  return JSON.parse(raw) as Messages;
}

// Bloc 93/E2: nothing used to compare the locale files against each other.
// `getMessagesForLocale` merges every locale onto English, so a key missing
// from de/es/tr renders English silently — no crash, no raw key, nothing to
// notice. 12 keys had drifted that way, 11 of them on screens users actually
// see. This test is the guard that was absent: it reads the files directly,
// deliberately bypassing the fallback merge that hides the gap.
/**
 * Bloc 118: the admin's own interface text is deliberately not in five
 * languages — it is the one exception to the rule above, and it is now the
 * whole admin rather than the audit log alone.
 *
 * src/proxy.ts clamps every /admin and /login request to English or French,
 * so a de/es/tr sentence in `admin`, `login` or `roles` could never be
 * rendered. Bloc 116/C exempted `admin.logs.` on exactly that reasoning and
 * left the other 440 admin keys in five languages; this bloc finishes the
 * job. Parity for these namespaces is EN/FR, asserted on its own below and
 * in admin-locale-scope.test.ts; the rule for the public site is unchanged
 * and still strict.
 */

describe("locale key parity", () => {
  it("gives every locale exactly the same keys as the fallback locale", async () => {
    const locales = await getAvailableLocales();
    const publicKeys = (messages: Messages) =>
      leafKeys(messages).filter((key) => !isAdminMessageKey(key));
    const reference = publicKeys(await readLocale(fallbackLocale));
    const referenceKeys = new Set(reference);

    const drift: Record<string, { missing: string[]; extra: string[] }> = {};
    for (const locale of locales) {
      if (locale === fallbackLocale) continue;
      const keys = new Set(publicKeys(await readLocale(locale)));
      const missing = reference.filter((key) => !keys.has(key));
      const extra = [...keys].filter((key) => !referenceKeys.has(key)).sort();
      if (missing.length || extra.length) drift[locale] = { missing, extra };
    }

    // Reported as one object so a failure names every locale and key at once,
    // instead of stopping at the first one.
    expect(drift).toEqual({});
  });

  // The exemption above is not a hole: the admin's own parity is checked
  // here, and the three locales that cannot render it must not carry it.
  it("keeps the admin's interface text in English and French, and only those", async () => {
    const carriers: Record<string, string[]> = {};
    for (const locale of await getAvailableLocales()) {
      const keys = leafKeys(await readLocale(locale)).filter(isAdminMessageKey);
      if (keys.length) carriers[locale] = keys;
    }
    expect(Object.keys(carriers).sort()).toEqual([...adminLocales].sort());
    expect(carriers.fr, "French and English have drifted apart").toEqual(
      carriers.en,
    );
    // A guard against the exemption swallowing the admin whole: the keys it
    // covers must still be there, in both languages.
    expect(
      carriers.en.some((key) => key.startsWith("admin.logs.messages.")),
      "the audit sentences are gone",
    ).toBe(true);
    expect(
      carriers.en.some((key) => key.startsWith("login.")),
      "the sign-in page is gone",
    ).toBe(true);
  });

  it("covers all 5 shipped locales", async () => {
    expect(await getAvailableLocales()).toEqual(["de", "en", "es", "fr", "tr"]);
  });

  it("has no empty or whitespace-only translation", async () => {
    const blank: Record<string, string[]> = {};
    for (const locale of await getAvailableLocales()) {
      const messages = await readLocale(locale);
      const offenders = leafKeys(messages).filter((key) => {
        const value = key
          .split(".")
          .reduce<unknown>(
            (current, part) =>
              isMessageObject(current) ? current[part] : undefined,
            messages,
          );
        return typeof value === "string" && value.trim() === "";
      });
      if (offenders.length) blank[locale] = offenders;
    }
    expect(blank).toEqual({});
  });
});
