import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Bloc 120: derives the site's locale list from the translation files that are
 * actually present, so adding a language is a file and nothing else.
 *
 * Why a build step rather than a scan at runtime — measured, not assumed:
 *
 * `src/lib/translations.ts` is imported by client components (GuideStatusList,
 * EditorialLocaleSelect). Putting a `node:fs` read in it fails the build
 * outright, in the browser chunking context:
 *
 *     the chunking context (unknown) does not support external modules
 *     (request: node:fs)
 *
 * The constraint is NOT where it looks: `src/proxy.ts` could read the disk.
 * Next 16 renamed Middleware to Proxy and runs it on the Node.js runtime by
 * default (proxy.md, "Runtime"), and a build with `readdirSync` there
 * succeeds. It is the browser bundle that cannot, and one shared module feeds
 * both. Deriving once, at build time, gives every context — client, server,
 * proxy, Vitest, `tsc` — the same plain array, and keeps the locale segments
 * statically prerenderable: `generateStaticParams` in
 * `src/app/[locale]/layout.tsx` reads this list, so it has to exist before the
 * first page is rendered, not per request.
 */

/** A translation file names its locale: `fr`, or `pt-br` for a regional one. */
const localeFilePattern = /^([a-z]{2}(?:-[a-z]{2})?)\.json$/;

export const generatedModulePath = "src/lib/launch-locales.generated.ts";
export const messagesDirectory = "messages";

/**
 * The locales `directory` carries, default first, fallback second, the rest
 * alphabetically.
 *
 * The order is part of the contract, not a detail: it drives the language
 * columns of the guide translation tracker, the editorial locale pickers and
 * the `hreflang` list. A plain alphabetical sort would silently reshuffle all
 * three the day this became derived, so the two languages the site is built
 * around keep their places and only the others sort among themselves.
 */
export function deriveLaunchLocales(
  directory: string,
  { first }: { first: readonly string[] },
): string[] {
  const found = readdirSync(directory)
    .map((file) => localeFilePattern.exec(file)?.[1])
    .filter((locale): locale is string => Boolean(locale));
  const known = new Set(found);
  const leading = first.filter((locale) => known.has(locale));
  const rest = found
    .filter((locale) => !first.includes(locale))
    .sort((a, b) => a.localeCompare(b, "en"));
  return [...leading, ...rest];
}

export function renderModule(locales: readonly string[]): string {
  const entries = locales.map((locale) => `"${locale}"`).join(", ");
  return `// GENERATED FILE — do not edit, and do not commit it.
//
// Bloc 120: written from the contents of ${messagesDirectory}/ by
// scripts/generate-launch-locales.ts, which runs before dev, build and test.
// Adding a language means adding ${messagesDirectory}/<locale>.json and
// nothing else; this list follows on the next build.
export const launchLocales = [${entries}] as const;
`;
}

/**
 * Writes the module, and returns whether anything changed — so the generator
 * can run on every build without touching the file's mtime for nothing, which
 * would invalidate Turbopack's cache each time.
 */
export function writeGeneratedModule(
  root: string,
  locales: readonly string[],
): boolean {
  const target = path.join(root, generatedModulePath);
  const next = renderModule(locales);
  let current: string | null = null;
  try {
    current = readFileSync(target, "utf8");
  } catch {
    // Not written yet (a fresh clone, or a `dependencies` Docker stage that
    // has the lockfile but not the sources) — fall through and create it.
  }
  if (current === next) return false;
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, next, "utf8");
  return true;
}

export function generate(root: string): {
  locales: string[];
  changed: boolean;
} {
  const locales = deriveLaunchLocales(path.join(root, messagesDirectory), {
    // The site's default language, then the universal fallback — the same two
    // src/i18n/config.ts names, spelled here because this script runs outside
    // the app's module graph (plain Node, no `@/` alias).
    first: ["fr", "en"],
  });
  if (locales.length === 0)
    throw new Error(
      `No translation file in ${messagesDirectory}/ — refusing to generate an empty locale list.`,
    );
  return { locales, changed: writeGeneratedModule(root, locales) };
}

/**
 * Run as a command: `pnpm locales:generate`, which `dev`, `build`, `test` and
 * `typecheck` each chain before doing anything else.
 *
 * It used to also run from `postinstall`, with an `--if-present` flag that
 * skipped a missing messages/ directory. That broke the Docker image: its
 * `dependencies` stage copies only the manifests and runs `pnpm install`, so
 * `postinstall` fired in an image where this very file did not exist yet and
 * failed the build (run 818). The flag guarded the absence of the directory;
 * what was missing was the script. Nothing calls this outside a working tree
 * now, so a missing messages/ is a broken checkout and says so.
 */
function main() {
  const { locales, changed } = generate(process.cwd());
  if (changed)
    console.log(
      `${generatedModulePath}: ${locales.length} locales (${locales.join(", ")})`,
    );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
)
  main();
