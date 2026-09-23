import { resetE2eDatabase } from "./e2e-seed";

// Bloc 121: the seeding itself moved to e2e-seed.ts so the Playwright suite
// can call it between attempts. This stays the command
// `pnpm test:e2e:prepare` runs before the dev server starts.
resetE2eDatabase().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
