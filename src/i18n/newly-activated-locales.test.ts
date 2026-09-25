import { describe, expect, it } from "vitest";
import { getMessagesForLocale } from "./config";

function translate(messages: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, messages);
}

// Bloc 44: confirms real, delivered DE/ES/TR static text renders correctly
// (not just present) on the public screens — Navigation (every page) and
// /tools — for each of the 3 newly-activated locales.
//
// Bloc 118: /admin used to be the third screen here, asserting "Panel" and
// "Kontrol Paneli". The admin is EN/FR now, so that expectation moved to the
// opposite assertion below: the same key, read in the same three locales,
// must come back in English. The public half is deliberately untouched — it
// is this bloc's non-regression guard that narrowing the admin narrowed
// nothing else.
//
// Bloc 129 §3.2 : la clé lue pour /tools change de nom. « tools.title »
// portait le titre de la section Outils de l'accueil, que la page reprenait
// mot pour mot (Bloc 38/K) ; la page a maintenant son propre titre et son
// propre chapô, et c'est le chapô qui a hérité de la phrase. On la garde :
// une phrase entière prouve mieux qu'un mot qu'on lit bien la locale.
describe("Bloc 44: DE/ES/TR static text on the public screens", () => {
  const expectations = {
    de: {
      "Navigation.tools": "Werkzeuge",
      "tools.index-intro":
        "Entscheide mit den richtigen Zahlen: Kosten, Produktion, Rangliste und Fähigkeiten, mit Simulatoren für jede Entscheidung.",
    },
    es: {
      "Navigation.tools": "Herramientas",
      "tools.index-intro":
        "Decide con las cifras correctas: explora costes, producción, clasificación y habilidades con simuladores pensados para preparar cada decisión.",
    },
    tr: {
      "Navigation.tools": "Araçlar",
      "tools.index-intro":
        "Doğru rakamlarla karar ver: maliyetleri, üretimi, sıralamayı ve yetenekleri her kararı hazırlamak için tasarlanmış simülatörlerle keşfet.",
    },
  } as const;

  for (const [locale, keys] of Object.entries(expectations)) {
    it(`renders ${locale.toUpperCase()} text on Navigation and /tools`, async () => {
      const messages = await getMessagesForLocale(locale);
      for (const [path, expected] of Object.entries(keys))
        expect(translate(messages, path)).toBe(expected);
    });
  }

  // The admin screen these three locales used to cover, now on the other
  // side of the border drawn by Bloc 118.
  it("reads the admin dashboard in English in all three", async () => {
    for (const locale of ["de", "es", "tr"]) {
      const messages = await getMessagesForLocale(locale);
      expect(translate(messages, "admin.dashboard.title")).toBe("Dashboard");
      expect(translate(messages, "login.title")).toBe("Admin sign in");
    }
  });
});
