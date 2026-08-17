import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:3000" },
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
});
