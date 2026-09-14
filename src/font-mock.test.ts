import { describe, expect, it } from "vitest";
// Bloc 91/M1 (Codex review, PR #113): importing next/font/google under vitest
// must resolve through the mock in vitest.setup.ts, not hang. A regression
// guard for the earlier Proxy that answered `then` and made the mocked module
// look like a never-resolving thenable. The static import at the top is itself
// the assertion — a broken mock would hang module resolution here.
import { Cinzel, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";

describe("Bloc 91/M1: next/font/google mock", () => {
  it("exposes usable font loaders without hanging on import", () => {
    for (const loader of [Cinzel, IBM_Plex_Sans, JetBrains_Mono]) {
      expect(typeof loader).toBe("function");
      expect(loader({ subsets: ["latin"] })).toMatchObject({ variable: "" });
    }
  });
});
