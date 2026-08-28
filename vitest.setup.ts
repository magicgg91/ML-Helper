import "@testing-library/jest-dom/vitest";

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
