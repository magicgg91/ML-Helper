import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Bloc 91/M1: next/font/google is a build-time loader Next's compiler
// transforms; imported directly under vitest it throws. Stub the families the
// app uses so any component that loads a font (e.g. the root layout) can be
// unit-tested. The real self-hosting is exercised by the production build.
// Codex review (PR #113): expose the loaders by name rather than a catch-all
// Proxy — a Proxy that also answers `then` reads as a thenable, and Vitest
// awaiting the mocked module namespace would then hang on module load.
vi.mock("next/font/google", () => {
  const loader = () => ({ className: "", variable: "", style: {} });
  return { Cinzel: loader, IBM_Plex_Sans: loader, JetBrains_Mono: loader };
});

// Bloc 91/E1: unit tests render components in isolation, without the Next.js
// router context next-intl's locale-aware navigation needs. Stub it globally
// so a public `<Link href="/tools">` just renders an <a href="/tools"> the way
// next/link did before E1. Tests that need to assert navigation (e.g.
// locale-toggle) override this with their own spy-based mock.
vi.mock("@/i18n/navigation", async () => {
  const { createElement } = await import("react");
  const noopRouter = {
    push: () => {},
    replace: () => {},
    prefetch: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
  };
  return {
    Link: ({
      href,
      children,
      ...props
    }: {
      href: unknown;
      children?: unknown;
      [key: string]: unknown;
    }) =>
      createElement(
        "a",
        { href: typeof href === "string" ? href : "#", ...props },
        children as never,
      ),
    usePathname: () => "/",
    useRouter: () => noopRouter,
    redirect: () => {},
    getPathname: () => "/",
  };
});

// jsdom doesn't implement matchMedia — default to "no preference matched"
// so existing tests (which don't care about it) keep working; tests that
// do care override window.matchMedia themselves before rendering.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
