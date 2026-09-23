import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getMessagesForLocale } from "./config";
import { editorialLocales } from "@/components/editorial-locale-select";
import {
  adminLocales,
  adminNamespaces,
  isAdminMessageKey,
  launchLocales,
} from "@/lib/translations";

/**
 * Bloc 118: the admin is EN/FR, the public site is five languages, and this
 * file is what keeps the border between them where it belongs.
 *
 * Bloc 116/C removed the audit log's DE/ES/TR sentences and left the other
 * 440 admin keys behind, because nothing looked past the namespace named in
 * that brief. So the checks here are deliberately exhaustive rather than
 * sampled: every key of every locale file, and every namespace named by every
 * source file, are examined — and the list of admin namespaces is recomputed
 * from the import graph instead of being trusted.
 */

const sourceRoot = path.join(process.cwd(), "src");
const messagesDirectory = path.join(process.cwd(), "messages");

type Messages = Record<string, unknown>;

function isMessageObject(value: unknown): value is Messages {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function leafKeys(messages: Messages, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const dotted = `${prefix}${key}`;
    return isMessageObject(value) ? leafKeys(value, `${dotted}.`) : [dotted];
  });
}

async function readLocale(locale: string): Promise<Messages> {
  return JSON.parse(
    await readFile(path.join(messagesDirectory, `${locale}.json`), "utf8"),
  ) as Messages;
}

/** Every shipped source file, tests excluded — they render no route. */
async function sourceFiles(): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  async function walk(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name))
        found.set(full, await readFile(full, "utf8"));
    }
  }
  await walk(sourceRoot);
  return found;
}

/**
 * Resolves `@/…` and relative import specifiers the way the tsconfig alias and
 * Node do. Package imports (`next-intl`, `react`, …) resolve to null: they
 * carry no message namespace of this app's.
 */
function resolveImport(
  specifier: string,
  from: string,
  files: Map<string, string>,
): string | null {
  let base: string;
  if (specifier.startsWith("@/"))
    base = path.join(sourceRoot, specifier.slice(2));
  else if (specifier.startsWith("."))
    base = path.resolve(path.dirname(from), specifier);
  else return null;
  for (const candidate of [
    `${base}.tsx`,
    `${base}.ts`,
    path.join(base, "index.tsx"),
    path.join(base, "index.ts"),
  ])
    if (files.has(candidate)) return candidate;
  return null;
}

/** Transitive closure of `import … from "…"` over the given entry points. */
function reachableFrom(
  entries: readonly string[],
  files: Map<string, string>,
): Set<string> {
  const seen = new Set<string>();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    for (const match of (files.get(file) ?? "").matchAll(/from\s+"([^"]+)"/g)) {
      const resolved = resolveImport(match[1], file, files);
      if (resolved) queue.push(resolved);
    }
  }
  return seen;
}

/** A translator built with no namespace, whose keys are therefore absolute. */
const rootTranslator = /(?:useTranslations|getTranslations)\(\s*\)/;

/**
 * The top-level namespaces a file names — as the argument of
 * `useTranslations`/`getTranslations`, or, in a file that builds a root
 * translator, as the first segment of a fully-qualified key
 * (`t("admin.users.role")`, `` t(`roles.${role}`) `` in UsersManager).
 *
 * The literal scan is confined to those files on purpose: elsewhere a dotted
 * string is something else entirely — an audit message key in an API route,
 * a filename — and reading it as a namespace would make this audit report
 * routes that translate nothing. Everything is intersected with the
 * namespaces that actually exist, so no string can invent one either.
 */
function namespacesNamedBy(
  source: string,
  known: ReadonlySet<string>,
): Set<string> {
  const named = new Set<string>();
  const add = (candidate: string | undefined) => {
    const top = candidate?.split(".")[0];
    if (top && known.has(top)) named.add(top);
  };
  for (const match of source.matchAll(
    /(?:useTranslations|getTranslations)\(\s*["'`]([^"'`]+)["'`]/g,
  ))
    add(match[1]);
  for (const match of source.matchAll(/namespace:\s*["'`]([^"'`]+)["'`]/g))
    add(match[1]);
  if (rootTranslator.test(source))
    for (const match of source.matchAll(/["'`]([A-Za-z][\w-]*)\./g))
      add(match[1]);
  return named;
}

const underApp = (...segments: string[]) =>
  path.join(sourceRoot, "app", ...segments);

/**
 * Routes whose locale src/proxy.ts clamps to EN/FR. `forbidden.tsx` sits at
 * the app root rather than under /admin, but it is reached only by the
 * `forbidden()` call in the admin session guard — asserted below, so this
 * classification cannot quietly become wrong.
 */
function isAdminEntryPoint(file: string) {
  return (
    file.startsWith(underApp("admin") + path.sep) ||
    file.startsWith(underApp("login") + path.sep) ||
    file === underApp("forbidden.tsx")
  );
}

/** Every other route: the public site, rendered in all five languages. */
function isPublicEntryPoint(file: string) {
  return (
    file.startsWith(underApp() + path.sep) &&
    !isAdminEntryPoint(file) &&
    !file.startsWith(underApp("api") + path.sep)
  );
}

describe("Bloc 118: the admin's interface text is English and French only", () => {
  it("leaves no admin key at all in the three public-only locales", async () => {
    const survivors: Record<string, string[]> = {};
    for (const locale of launchLocales) {
      const keys = leafKeys(await readLocale(locale)).filter(isAdminMessageKey);
      if (keys.length) survivors[locale] = keys;
    }

    // Not a sample: `keys` above is every leaf of the whole file, and a single
    // surviving admin key in de/es/tr names itself in the failure.
    expect(Object.keys(survivors).sort()).toEqual([...adminLocales].sort());
    // Bloc 120: every locale that is not one of the admin's two, whatever
    // messages/ now holds — a sixth language added as a file is covered by
    // this the day it lands, without being named here.
    for (const locale of launchLocales)
      if (!(adminLocales as readonly string[]).includes(locale))
        expect(
          survivors[locale],
          `${locale} carries admin text`,
        ).toBeUndefined();
    // And the two that keep it really do keep all of it.
    expect(survivors.en.length).toBeGreaterThan(400);
  });

  it("carries every admin namespace in both English and French", async () => {
    for (const locale of adminLocales) {
      const messages = await readLocale(locale);
      for (const namespace of adminNamespaces)
        expect(
          leafKeys(messages).filter((key) => key.startsWith(`${namespace}.`)),
          `${namespace} is missing from ${locale}.json`,
        ).not.toHaveLength(0);
    }
  });

  it("renders an admin screen in English for a DE/ES/TR reader", async () => {
    // The clamp means this can only ever be reached through the fallback
    // merge; what matters is that it yields English text rather than a blank
    // or a raw key (AGENTS.md: a missing translation is never a blank).
    const english = (await getMessagesForLocale("en")) as Messages;
    for (const locale of ["de", "es", "tr"]) {
      const messages = (await getMessagesForLocale(locale)) as Messages;
      expect(messages.admin, `${locale} lost the admin fallback`).toEqual(
        english.admin,
      );
      expect(messages.login).toEqual(english.login);
      expect(messages.roles).toEqual(english.roles);
    }
  });
});

describe("Bloc 118: the border between admin and public is where it is declared", () => {
  it("declares exactly the namespaces the public site never renders", async () => {
    const files = await sourceFiles();
    const known = new Set(Object.keys(await readLocale("en")));
    const paths = [...files.keys()];

    const namespacesOf = (reachable: Set<string>) =>
      new Set(
        [...reachable].flatMap((file) => [
          ...namespacesNamedBy(files.get(file) ?? "", known),
        ]),
      );
    const adminSide = namespacesOf(
      reachableFrom(paths.filter(isAdminEntryPoint), files),
    );
    const publicSide = namespacesOf(
      reachableFrom(paths.filter(isPublicEntryPoint), files),
    );

    // Whatever only the admin renders must be declared as such — this is the
    // check that would have caught Bloc 116/C stopping at the audit log.
    expect([...adminSide].filter((ns) => !publicSide.has(ns)).sort()).toEqual(
      [...adminNamespaces].sort(),
    );
    // …and nothing declared admin-only may be rendered publicly.
    expect(
      [...adminNamespaces].filter((ns) => publicSide.has(ns)),
      "an admin namespace is reachable from a public route",
    ).toEqual([]);
  });

  it("reaches every namespace-bearing file from a route, leaving no blind spot", async () => {
    const files = await sourceFiles();
    const known = new Set(Object.keys(await readLocale("en")));
    const paths = [...files.keys()];
    const reachable = new Set([
      ...reachableFrom(paths.filter(isAdminEntryPoint), files),
      ...reachableFrom(paths.filter(isPublicEntryPoint), files),
    ]);

    // A component naming a namespace that no route imports would be invisible
    // to the classification above — the audit would silently skip it.
    const orphans = paths.filter(
      (file) =>
        !reachable.has(file) &&
        namespacesNamedBy(files.get(file) ?? "", known).size > 0,
    );
    expect(orphans.map((file) => path.relative(sourceRoot, file))).toEqual([]);
  });

  it("keeps the forbidden page an admin-only screen", async () => {
    const files = await sourceFiles();
    const callers = [...files].filter(([, source]) =>
      /\bforbidden\(\)/.test(source),
    );
    // `admin.forbidden` counts as admin text only because this page is
    // unreachable from the public site. It renders when the session guard
    // rejects a request, and that guard is imported by /admin pages alone.
    expect(callers.map(([file]) => path.relative(sourceRoot, file))).toEqual([
      "auth/require-session.ts",
    ]);
    const guardUsers = [...files]
      .filter(
        ([file, source]) =>
          file !== path.join(sourceRoot, "auth/require-session.ts") &&
          /require-session/.test(source),
      )
      .map(([file]) => path.relative(sourceRoot, file));
    expect(guardUsers.every((file) => file.startsWith("app/admin/"))).toBe(
      true,
    );
    expect(guardUsers.length).toBeGreaterThan(0);
  });
});

describe("Bloc 118: the public site keeps its five languages", () => {
  it("still offers all five locales for the content an admin writes for the public", () => {
    // The scope line of this bloc: guides, the legal notice and the reference
    // intros are read by the public in five languages, so their editors keep
    // offering five — narrowing the admin chrome must never narrow those.
    expect(editorialLocales).toEqual(launchLocales);
    // Bloc 120: more than the two the admin chrome is clamped to, without
    // naming them — the list is derived from messages/ now.
    expect(launchLocales.length).toBeGreaterThan(adminLocales.length);
    for (const locale of adminLocales)
      expect([...launchLocales]).toContain(locale);
  });

  it("keeps every public namespace in all five locales", async () => {
    const publicKeys = async (locale: string) =>
      leafKeys(await readLocale(locale)).filter(
        (key) => !isAdminMessageKey(key),
      );
    const reference = await publicKeys("en");
    expect(reference.length).toBeGreaterThan(500);
    for (const locale of launchLocales)
      expect(
        (await publicKeys(locale)).sort(),
        `${locale} drifted from the public reference`,
      ).toEqual([...reference].sort());
  });
});
