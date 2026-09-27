import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { launchLocales } from "./launch-locales.generated";
import {
  localizedFieldToStore,
  parseLocalizedField,
  type LocalizedField,
} from "./localized-field";
import { contentPairLocales, localizedText } from "./translations";

/**
 * Bloc 127/A.2 : ce qu'un administrateur écrit dans une langue revient dans
 * cette langue, et n'écrase aucune autre — sur les cinq langues du site.
 *
 * Ce fichier remplace `content-pair-round-trip.test.ts`, qui posait la même
 * question sur un modèle à deux langues. C'est le test qui aurait attrapé le
 * bug du Bloc 125 : non pas l'écriture, qui envoyait bien les deux champs d'un
 * coup, mais l'éditeur, qui offrait cinq langues au-dessus d'un modèle qui en
 * stockait deux et rabattait DE/ES/TR sur la colonne anglaise. Sa forme — « un
 * écran offre exactement les langues que son modèle stocke » — reste la bonne
 * question à poser après la migration, et la seconde partie la pose écran par
 * écran plutôt que sur une constante.
 */

/** Le chemin d'un module de `src`, pour les scans de source ci-dessous. */
const source = (relative: string) =>
  readFile(path.join(process.cwd(), "src", relative), "utf8");

/**
 * La source sans ses commentaires.
 *
 * Un module migré parle encore de la paire — pour dire qu'il l'a quittée et où
 * la migration se trouve. Ce qui fait foi est ce que le code déclare, pas ce que
 * la documentation raconte.
 */
const code = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/** Un champ de paire déclaré ou lu : `name_fr: …`, `metric_label_en?: …`. */
const pairField = /\w+_(?:fr|en)\s*\??:/;

/** L'écriture, telle que la route et l'éditeur la font : depuis un formulaire. */
const write = (form: Partial<Record<string, string>>): LocalizedField =>
  localizedFieldToStore(form);

/** La lecture publique, telle que la page la fait. */
const read = (field: LocalizedField, locale: string) =>
  localizedText(field, locale);

describe("Bloc 127/A.2 : le contenu éditorial, écrit et relu, sur N langues", () => {
  it("rend à chaque langue ce qui a été écrit pour elle", () => {
    const saved = write({
      fr: "Commandant",
      en: "Commander",
      de: "Kommandant",
      es: "Comandante",
      tr: "Komutan",
    });
    expect(read(saved, "fr")).toBe("Commandant");
    expect(read(saved, "en")).toBe("Commander");
    expect(read(saved, "de")).toBe("Kommandant");
    expect(read(saved, "es")).toBe("Comandante");
    expect(read(saved, "tr")).toBe("Komutan");
  });

  it("ne laisse pas l'édition d'une langue atteindre une autre", () => {
    // La classe de bug du Bloc 125, sur le nouveau modèle : chaque langue a sa
    // propre clé, donc écrire l'allemand ne peut plus toucher l'anglais.
    const before = write({ fr: "Commandant", en: "Commander" });
    const after = write({ ...before, de: "Kommandant" });
    expect(read(after, "de")).toBe("Kommandant");
    expect(read(after, "en")).toBe("Commander");
    expect(read(after, "fr")).toBe("Commandant");
    expect(Object.keys(after).sort()).toEqual(["de", "en", "fr"]);
  });

  it("efface une langue sans rien dire aux autres", () => {
    const after = write({
      fr: "Commandant",
      en: "Commander",
      de: "",
    });
    expect(after).toEqual({ fr: "Commandant", en: "Commander" });
    // Effacer l'allemand rend l'allemand à l'anglais, il ne le vide pas.
    expect(read(after, "de")).toBe("Commander");
  });

  it("laisse une langue non traduite absente, jamais écrite vide", () => {
    // Le point que le Bloc 126/D a payé : `""` est une traduction qui existe
    // et ne dit rien, sur laquelle `localizedText` s'arrête. Absente, elle se
    // replie. C'est la seule différence entre un visiteur allemand qui lit
    // l'anglais et un visiteur allemand qui lit une page blanche.
    const saved = write({ fr: "Commandant", en: "Commander" });
    expect(saved).not.toHaveProperty("de");
    for (const locale of launchLocales.filter(
      (code) => code !== "fr" && code !== "en",
    ))
      expect(read(saved, locale), locale).toBe("Commander");
  });

  it("sert quelque chose à chacune des langues du site, même écrit dans une seule", () => {
    const french = write({ fr: "Commandant" });
    for (const locale of launchLocales)
      expect(read(french, locale), locale).not.toBe("");
  });

  it("relit ce qui est stocké sans rien ajouter", () => {
    const saved = write({ fr: "Commandant", de: "Kommandant" });
    expect(parseLocalizedField(saved)).toEqual(saved);
  });
});

/**
 * Les quatre écrans de l'audit, et la langue que chacun offre.
 *
 * `model` est ce que le module de données stocke, `tabs` ce que l'éditeur
 * monte. Les deux sont vérifiés dans la source plutôt que déclarés ici : une
 * PR qui migre un écran sans déplacer ses onglets — ou l'inverse — fait tomber
 * ce test, qui est exactement ce que le Bloc 125 aurait voulu.
 */
const editorialScreens = [
  {
    screen: "Boutique",
    module: "lib/consumables.ts",
    editor: "components/admin-shop-editor.tsx",
    // Migré par cette PR (Bloc 127, PR 1/3).
    localized: true,
  },
  {
    screen: "Templiers, présentation",
    module: "lib/templars-presentation.ts",
    editor: "components/admin-templars-editor.tsx",
    // Migré par cette PR (Bloc 127, PR 2/3).
    localized: true,
  },
  {
    screen: "Libellés de métrique des équipements",
    module: "lib/reference-equipment-server.ts",
    editor: "components/admin-equipment-editor.tsx",
    // Migré par cette PR (Bloc 127, PR 2/3). Son libellé se lit sans repli
    // (voir `secondaryLabel`), ce que la colonne « onglets » ne dit pas : elle
    // ne parle que de ce qui est offert à l'écriture.
    localized: true,
  },
  {
    screen: "Événements",
    module: "lib/events.ts",
    editor: "components/admin-events-editor.tsx",
    // Migré par la PR 3/3.
    localized: false,
  },
] as const;

describe("Bloc 127/A.2 : un écran offre exactement les langues que son modèle stocke", () => {
  it.each(editorialScreens)(
    "$screen",
    async ({ module, editor, localized }) => {
      const [moduleSource, editorSource] = await Promise.all([
        source(module),
        source(editor),
      ]);
      // Le modèle : un champ par langue, ou la paire `<champ>_fr`/`_en`.
      expect(
        pairField.test(code(moduleSource)),
        `${module} stocke une paire`,
      ).toBe(!localized);
      // Les onglets : `contentPairLocales` limite à deux, son absence laisse
      // `LangTabs` sur les cinq langues du site.
      expect(
        /locales=\{contentPairLocales\}/.test(code(editorSource)),
        `${editor} limite ses onglets à la paire`,
      ).toBe(!localized);
      expect(/<LangTabs/.test(editorSource), `${editor} monte LangTabs`).toBe(
        true,
      );
    },
  );

  it("garde la constante de la paire tant qu'un écran s'en sert, et pas au-delà", async () => {
    const stillPaired = editorialScreens.filter(({ localized }) => !localized);
    const translations = await source("lib/translations.ts");
    if (stillPaired.length) {
      expect([...contentPairLocales]).toEqual(["fr", "en"]);
      expect(
        contentPairLocales.every((code) => launchLocales.includes(code)),
      ).toBe(true);
    } else {
      // La PR 3 emporte le dernier écran : la paire n'a alors plus de modèle
      // derrière elle, et une constante qui survit à son dernier lecteur est
      // ce que le prochain éditeur reprendra par erreur.
      expect(
        /contentPairLocales/.test(code(translations)),
        "plus aucun écran ne stocke de paire : la constante doit partir avec le dernier",
      ).toBe(false);
    }
  });
});
