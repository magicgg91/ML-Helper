import { defineConfig, devices } from "@playwright/test";
import { e2eDatabaseUrl } from "./prisma/e2e-database";
export default defineConfig({
  testDir: "./e2e",
  // Bloc 33/B: colorScheme pinned so the suite's pre-existing "starts dark,
  // click to switch to light" assertions stay deterministic — Playwright's
  // own default (light) would otherwise make the initial-theme auto-detect
  // from prefers-color-scheme (already covered by unit tests) leak into
  // every e2e test that touches the theme toggle.
  // Bloc 47/B: same reasoning for locale — Chromium's own default sends
  // "en-US,en;q=0.9" as its Accept-Language header (CI runners are
  // English-locale machines), which src/proxy.ts's new browser-language
  // detection (already covered by unit tests) would otherwise pick up and
  // silently switch the entire suite's default-locale assertions from
  // French to English on a cookie-less first navigation.
  use: {
    baseURL: "http://127.0.0.1:3000",
    colorScheme: "dark",
    locale: "fr-FR",
  },
  webServer: {
    command: "pnpm test:e2e:prepare && pnpm dev",
    url: "http://127.0.0.1:3000",
    // Bloc 120: `pnpm dev` now derives the locale list before starting Next
    // (scripts/generate-launch-locales.ts), and the first request still has to
    // compile the route through Turbopack from a cold cache. The two together
    // measured close enough to Playwright's 60s default to have timed the
    // suite out once while writing this bloc. Three minutes is room, not a
    // mask: a server that never comes up still fails the run.
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: e2eDatabaseUrl,
      NEXTAUTH_URL: "http://127.0.0.1:3000",
      NEXTAUTH_SECRET: "e2e-only-secret-not-for-production",
    },
  },
  // Bloc 121: two projects over one browser, and the split exists for one
  // reason — phase-one.spec.ts resets the database between attempts, and a
  // reset that lands while another file is mid-read would drop the tables out
  // from under it. `dependencies` makes the admin scenario start only once
  // every other file has finished, so the reset can never reach them.
  //
  // It is the only file that writes: every other spec reads the seeded data
  // and nothing else (checked across the suite), which is what makes the
  // ordering enough on its own — no second server, no second database.
  //
  // The cost, measured on this runner: the two groups no longer overlap, so
  // the suite goes from ~240s to ~265s. The trade the other way is that a
  // failure in `public` skips `admin`; a red run is a red run either way, and
  // the 46-test admin scenario is the half that needed the retry.
  projects: [
    {
      name: "public",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /phase-one\.spec\.ts/,
    },
    {
      name: "admin",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /phase-one\.spec\.ts/,
      dependencies: ["public"],
    },
  ],
  // Bloc 116/B: one retry, in CI only.
  //
  // A retry buys back the failures that are the runner's and not the app's —
  // a socket reset from the dev server under concurrent load, a container
  // that stalls — which cost a full red pipeline and a manual re-run twice in
  // one week here. One, not more: a test that fails twice in a row on the
  // same commit is telling the truth, and stacking attempts until it passes
  // is how a genuinely broken test gets shipped. A flaky pass is reported as
  // "flaky", not as a pass, so the signal survives.
  //
  // Locally there are no retries at all: a test that fails while you are
  // writing it should fail immediately, not after a second attempt.
  //
  // Bloc 121: this now covers every file. phase-one.spec.ts used to opt out
  // (`retries: 0` in its own describe.configure) because a retry replayed its
  // one-time setup against a database that already had it; it resets that
  // database at the start of each attempt instead, so there is nothing left
  // to exclude.
  retries: process.env.CI ? 1 : 0,
});
