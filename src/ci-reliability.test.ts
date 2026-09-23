import { readFileSync, readdirSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Bloc 116/A — the build reads its fonts off disk.
//
// next/font/google self-hosts what it serves, but it fetches the files from
// Google at build time and at every `next dev` start. That call took CI down
// twice in one morning (PR #140's Docker image job, PR #141's e2e web
// server). These guard the two halves of the fix: nothing asks Google any
// more, and every file the layout declares is really here.
// ---------------------------------------------------------------------------
function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("Bloc 116/A: fonts are served from the repository", () => {
  it("asks no font loader that reaches the network", () => {
    // A loader that downloads cannot fail a build that never calls it. Swept
    // over the whole app source, not layout.tsx alone, so a second component
    // cannot quietly bring the dependency back. An *import* of it, not the
    // string: layout.tsx's own comment explains why it left, and this file
    // names it too.
    const imports = /from\s+["']next\/font\/google["']/;
    const offenders = sourceFiles("src").filter((file) =>
      imports.test(readFileSync(file, "utf8")),
    );
    expect(offenders, "next/font/google is back in the app source").toEqual([]);
  });

  it("carries every weight the layout declares, as real woff2", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    const declared = [...layout.matchAll(/path: "\.\/(fonts\/[^"]+)"/g)].map(
      (match) => match[1],
    );
    // Three families, and the weights globals.css actually uses.
    expect(declared.length).toBe(8);
    for (const relative of declared) {
      const bytes = readFileSync(`src/app/${relative}`);
      // wOF2 is the format's own magic number: an HTML error page saved under
      // a .woff2 name would sail through a mere existence check.
      expect(
        bytes.subarray(0, 4).toString("latin1"),
        `${relative} is not a woff2 file`,
      ).toBe("wOF2");
    }
  });

  it("ships the licence the three families are redistributed under", () => {
    const readme = readFileSync("src/app/fonts/README.md", "utf8");
    expect(readme).toContain("SIL Open Font License");
    for (const family of ["IBM Plex Sans", "Cinzel", "JetBrains Mono"])
      expect(readme, `${family} is not credited`).toContain(family);
  });
});

// ---------------------------------------------------------------------------
// Bloc 116/B — one retry, in CI only.
// ---------------------------------------------------------------------------
describe("Bloc 116/B: Playwright retries", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const loadConfig = async () => {
    vi.resetModules();
    return (await import("../playwright.config")).default;
  };

  it("retries once in CI", async () => {
    vi.stubEnv("CI", "1");
    expect((await loadConfig()).retries).toBe(1);
  });

  it("never retries locally, where a failure should be immediate", async () => {
    vi.stubEnv("CI", "");
    expect((await loadConfig()).retries).toBe(0);
  });

  // The guard that matters: one attempt back, not attempts until it passes.
  // A test that fails twice on the same commit is telling the truth, and a
  // higher number is how a genuinely broken test gets shipped green. The
  // companion check — that a systematically broken test still ends red after
  // its retry — is a live Playwright run, recorded in the PR.
  it("buys back one attempt, not an unbounded number", async () => {
    vi.stubEnv("CI", "1");
    expect((await loadConfig()).retries).toBeLessThanOrEqual(1);
  });
});
