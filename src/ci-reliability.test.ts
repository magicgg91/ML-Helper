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

  // Bloc 121 replaces what stood here. A retry only helps a test that can
  // start from the state it asserts, and the serial scenario in
  // phase-one.spec.ts could not — so it used to opt out with `retries: 0`,
  // and this asserted that it kept doing so. It now rebuilds the database
  // before each attempt instead, and the assertion is the opposite one: the
  // opt-out must be gone, and the reset that replaced it must be there.
  it("lets the serial scenario retry, now that each attempt reseeds", () => {
    const spec = readFileSync("e2e/phase-one.spec.ts", "utf8");
    const configure = spec.match(/test\.describe\.configure\(([^)]*)\)/)?.[1];
    expect(
      configure,
      "phase-one.spec.ts no longer configures itself",
    ).toBeDefined();
    expect(configure).toContain('mode: "serial"');
    expect(
      configure,
      "the serial scenario is opting out of the retry again",
    ).not.toContain("retries");
    // The opt-out is only safe to drop because of this hook — asserted
    // together so one can never be removed without the other.
    expect(spec, "nothing reseeds the database between attempts").toMatch(
      /test\.beforeAll\(async \(\) => \{\s*await resetE2eDatabase\(\);/,
    );
  });

  // The reset drops tables. Ordering the projects is what keeps it away from
  // the files that are reading them, so the two belong to the same fix.
  it("runs the admin scenario after every other file, never alongside", async () => {
    const config = await loadConfig();
    const projects = config.projects ?? [];
    const admin = projects.find((project) => project.name === "admin");
    const publicProject = projects.find((project) => project.name === "public");
    expect(admin?.testMatch, "the admin project lost phase-one").toEqual(
      /phase-one\.spec\.ts/,
    );
    expect(
      publicProject?.testIgnore,
      "the public project would run phase-one too",
    ).toEqual(/phase-one\.spec\.ts/);
    expect(
      admin?.dependencies,
      "the reset could land while another file is reading",
    ).toEqual(["public"]);
  });
});

// ---------------------------------------------------------------------------
// Bloc 122 — an install-time script may only need what the image has by then.
// ---------------------------------------------------------------------------
describe("Bloc 122: install lifecycle scripts and the Docker dependencies stage", () => {
  /**
   * What broke: Bloc 120 added `postinstall: tsx
   * scripts/generate-launch-locales.ts`. The Dockerfile's `dependencies` stage
   * copies the manifests and nothing else before running `pnpm install`, so
   * the hook fired in an image where that script did not exist, `pnpm install`
   * exited 1 and the whole image build died (run 818). CI never caught it:
   * the `image` job is `if: github.event_name == 'push'`, so no pull request
   * ever exercises it.
   *
   * The rule, rather than the instance: whatever `pnpm install` triggers can
   * only reach files that stage has already copied.
   */
  const lifecycle = ["preinstall", "install", "postinstall", "prepare"];

  /** The files `COPY`'d into the dependencies stage before `pnpm install`. */
  function copiedBeforeInstall(): string[] {
    const dockerfile = readFileSync("Dockerfile", "utf8").split("\n");
    const start = dockerfile.findIndex((line) =>
      /^FROM .* AS dependencies/.test(line),
    );
    expect(
      start,
      "the dependencies stage is gone from the Dockerfile",
    ).toBeGreaterThanOrEqual(0);
    const copied: string[] = [];
    for (const line of dockerfile.slice(start + 1)) {
      if (/^RUN\s+pnpm install/.test(line)) return copied;
      if (/^FROM /.test(line)) break;
      const copy = /^COPY\s+(.+)$/.exec(line.trim());
      // Everything but the destination, which is the last token.
      if (copy) copied.push(...copy[1].split(/\s+/).slice(0, -1));
    }
    throw new Error("no `RUN pnpm install` found in the dependencies stage");
  }

  it("asks pnpm install for nothing the stage has not copied yet", () => {
    const { scripts } = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    const copied = new Set(copiedBeforeInstall());
    for (const hook of lifecycle) {
      const command = scripts[hook];
      if (!command) continue;
      // Any token that looks like a path into the repository.
      for (const [, file] of command.matchAll(/(^|\s)([\w./-]+\/[\w./-]+)/g))
        expect(
          copied.has(file),
          `${hook} runs "${file}", which the Docker dependencies stage has not copied — the image build will fail on it`,
        ).toBe(true);
    }
  });

  // The instance, kept alongside the rule: the hook that caused it is gone,
  // and the generation it did is chained into the scripts that need it.
  it("generates the locale list from the scripts that need it, not from install", () => {
    const { scripts } = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(scripts.postinstall).toBeUndefined();
    for (const script of ["dev", "build", "test", "typecheck"])
      expect(
        scripts[script],
        `${script} no longer derives the locale list first`,
      ).toContain("locales:generate");
  });
});
