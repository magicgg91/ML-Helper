import { describe, expect, it } from "vitest";
// Bloc 91/M1 (Codex review, PR #113): importing the next/font loader under
// vitest must resolve through the mock in vitest.setup.ts, not hang. A
// regression guard for the earlier Proxy that answered `then` and made the
// mocked module look like a never-resolving thenable. The static import at the
// top is itself the assertion — a broken mock would hang module resolution
// here. Bloc 116/A: next/font/local, since that is what layout.tsx loads now.
import localFont from "next/font/local";

describe("Bloc 91/M1: next/font mock", () => {
  it("exposes a usable font loader without hanging on import", () => {
    expect(typeof localFont).toBe("function");
    expect(localFont({ src: "./x.woff2" })).toMatchObject({ variable: "" });
  });
});
