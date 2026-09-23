import { defineConfig, devices } from "@playwright/test";
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
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: "file:./e2e.db",
      NEXTAUTH_URL: "http://127.0.0.1:3000",
      NEXTAUTH_SECRET: "e2e-only-secret-not-for-production",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
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
  retries: process.env.CI ? 1 : 0,
});
