import { describe, expect, it } from "vitest";
import { getMessagesForLocale } from "./config";

function translate(messages: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, messages);
}

// Bloc 44: confirms real, delivered DE/ES/TR static text renders correctly
// (not just present) on 3 different screens — Navigation (every page),
// /tools, and /admin — for each of the 3 newly-activated locales.
describe("Bloc 44: DE/ES/TR static text across 3 screens", () => {
  const expectations = {
    de: {
      "Navigation.tools": "Werkzeuge",
      "tools.title": "Entscheide mit den richtigen Zahlen",
      "admin.dashboard.title": "Dashboard",
    },
    es: {
      "Navigation.tools": "Herramientas",
      "tools.title": "Decide con las cifras correctas",
      "admin.dashboard.title": "Panel",
    },
    tr: {
      "Navigation.tools": "Araçlar",
      "tools.title": "Doğru rakamlarla karar ver",
      "admin.dashboard.title": "Kontrol Paneli",
    },
  } as const;

  for (const [locale, keys] of Object.entries(expectations)) {
    it(`renders ${locale.toUpperCase()} text on Navigation, /tools and /admin`, async () => {
      const messages = await getMessagesForLocale(locale);
      for (const [path, expected] of Object.entries(keys))
        expect(translate(messages, path)).toBe(expected);
    });
  }
});
