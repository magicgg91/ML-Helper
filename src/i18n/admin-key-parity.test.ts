import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Bloc 125 §8: every message key the admin actually asks for exists in both
 * of the admin's languages.
 *
 * The existing audits check the *namespaces* an admin file names
 * (admin-locale-scope.test.ts) and spot-check a handful of headings by hand
 * (admin-messages.test.ts). Neither would have caught a single key added to
 * one file and not the other — which is how a screen ends up reading English
 * with the interface in French, or printing its own key.
 *
 * Only literal keys are resolved. A key built from a template literal
 * (`` t(`leagues.${league}`) ``) has no single value to look up here; those
 * are covered by the locale-parity audit, which compares the two files whole.
 */

const sourceRoot = path.join(process.cwd(), "src");
const messagesDirectory = path.join(process.cwd(), "messages");

type Messages = Record<string, unknown>;

async function readLocale(locale: string): Promise<Messages> {
  return JSON.parse(
    await readFile(path.join(messagesDirectory, `${locale}.json`), "utf8"),
  ) as Messages;
}

function lookup(messages: Messages, key: string): unknown {
  return key.split(".").reduce<unknown>((current, segment) => {
    if (typeof current !== "object" || current === null) return undefined;
    return (current as Messages)[segment];
  }, messages);
}

/** Every admin source file: the routes under /admin and what they import. */
async function adminSources(): Promise<Map<string, string>> {
  const all = new Map<string, string>();
  async function walk(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name))
        all.set(full, await readFile(full, "utf8"));
    }
  }
  await walk(sourceRoot);

  const resolve = (specifier: string, from: string) => {
    let base: string;
    if (specifier.startsWith("@/"))
      base = path.join(sourceRoot, specifier.slice(2));
    else if (specifier.startsWith("."))
      base = path.resolve(path.dirname(from), specifier);
    else return null;
    for (const candidate of [`${base}.tsx`, `${base}.ts`])
      if (all.has(candidate)) return candidate;
    return null;
  };

  const admin = new Map<string, string>();
  const queue = [...all.keys()].filter((file) =>
    file.startsWith(path.join(sourceRoot, "app", "admin")),
  );
  while (queue.length) {
    const file = queue.pop();
    if (!file || admin.has(file)) continue;
    const source = all.get(file);
    if (source === undefined) continue;
    admin.set(file, source);
    for (const match of source.matchAll(/from\s+"([^"]+)"/g)) {
      const resolved = resolve(match[1], file);
      if (resolved) queue.push(resolved);
    }
  }
  return admin;
}

/**
 * The keys a file looks up, each with the namespaces it could belong to.
 *
 * A file often holds several components, and each binds its own `t` to its
 * own namespace — admin-tool-editors.tsx has five. Rather than parse the
 * file into scopes, a name carries every namespace it is ever bound to in
 * that file, and a key counts as found when it resolves under any of them.
 * That is a deliberate relaxation: it cannot invent a failure, and it still
 * catches the one that matters — a key that exists under none of them, in
 * one language or in neither.
 */
function keysUsedBy(source: string): { key: string; namespaces: string[] }[] {
  const bindings = new Map<string, Set<string>>();
  for (const match of source.matchAll(
    /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:["'`]([^"'`]*)["'`])?\s*\)/g,
  )) {
    const namespaces = bindings.get(match[1]) ?? new Set<string>();
    namespaces.add(match[2] ?? "");
    bindings.set(match[1], namespaces);
  }

  const found: { key: string; namespaces: string[] }[] = [];
  for (const [name, namespaces] of bindings)
    for (const match of source.matchAll(
      new RegExp(`\\b${name}(?:\\.has|\\.rich)?\\(\\s*"([^"]+)"`, "g"),
    ))
      found.push({ key: match[1], namespaces: [...namespaces] });
  return found;
}

describe("Bloc 125 §8: the admin's own message keys", () => {
  it("resolves every literal key it uses in both EN and FR", async () => {
    const [fr, en] = await Promise.all([readLocale("fr"), readLocale("en")]);
    const missing: string[] = [];
    let checked = 0;
    const resolves = (messages: Messages, key: string, namespaces: string[]) =>
      namespaces.some(
        (namespace) =>
          lookup(messages, namespace ? `${namespace}.${key}` : key) !==
          undefined,
      );
    for (const [file, source] of await adminSources())
      for (const { key, namespaces } of keysUsedBy(source)) {
        checked += 1;
        const short = path.relative(process.cwd(), file);
        const where = `${key} [${namespaces.join(" | ")}] (${short})`;
        if (!resolves(fr, key, namespaces)) missing.push(`fr ${where}`);
        if (!resolves(en, key, namespaces)) missing.push(`en ${where}`);
      }
    // The scan itself has to be doing something: a regex that stopped
    // matching would pass this test by checking nothing at all.
    expect(checked).toBeGreaterThan(300);
    expect(missing).toEqual([]);
  });

  it("names every edit screen after the thing it edits", async () => {
    // Bloc 125 §8: one name per tool or reference, shared by the table that
    // lists it and the screen that edits it — "Outils / Templiers", not
    // "Outils / Paramètres de coût des Templiers" on one side and
    // "Templiers" on the other.
    const [fr, en] = await Promise.all([readLocale("fr"), readLocale("en")]);
    const expected: Record<string, [string, string]> = {
      "admin.referentiels.references.templiers": ["Templiers", "Templars"],
      "admin.referentiels.references.gemmes": ["Gemmes", "Gems"],
      "admin.referentiels.references.consommables": ["Boutique", "Shop"],
      "admin.referentiels.references.events": ["Événements", "Events"],
      "admin.referentiels.references.level-up": ["Progression", "Level Up"],
      "admin.referentiels.references.combat-equipment": [
        "Équipements de Combat",
        "Combat Equipment",
      ],
      "admin.referentiels.references.expedition-equipment": [
        "Équipements d’Expédition",
        "Expedition Equipment",
      ],
      "ranking.name": ["Classement", "Ranking"],
      "xp-gain-rate.name": ["Taux de gain d’XP", "XP Gain Rate"],
      "demo-attack-troops.name": [
        "Troupes en attaque démo",
        "Demo Attack Troops",
      ],
      "admin.tools.city-parameters": [
        "Paramètres Villes partagés",
        "Shared City parameters",
      ],
    };
    for (const [key, [french, english]] of Object.entries(expected)) {
      expect(lookup(fr, key), key).toBe(french);
      expect(lookup(en, key), key).toBe(english);
    }
  });
});
