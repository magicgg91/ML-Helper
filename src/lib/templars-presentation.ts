import { templarKeys, templeBase, type TemplarKey } from "./player-settings";
import { templarRates } from "./gems-templars";
import { type LocalizedField } from "./localized-field";

// Bloc 66/B, restored Bloc 68/C: the presentation catalog behind the tile
// section — one row per Templar, fully editable in admin (Image, Nom,
// Description, Base Temple, Bonus), matching the original spec. A prior
// review pass (Codex, PR #85) made temple_base/bonus read-only/computed
// from the templeBase/templarRates constants directly, reasoning that a
// separately-stored copy could drift from what the real calculators use —
// but the porteur de projet confirmed (Bloc 68/C) that editable Base
// Temple/Bonus was the intended spec all along, so that change is
// reverted: both fields are stored and admin-editable again, seeded from
// (not permanently tied to) the confirmed templeBase/templarRates
// constants. An empty value is treated as "not confirmed yet" and shown
// as such publicly (see TemplarPresentationTile), never invented.
/**
 * Bloc 127 (PR 2/3) : le nom et la description passent de la paire FR/EN à un
 * champ par langue (`LocalizedField`, posé en PR 1/3), comme la Boutique.
 *
 * `image`, `temple_base` et `bonus` ne sont pas du texte éditorial et ne
 * bougent pas. Les cinq **noms de compétence** de `messages/*.json`
 * (`game.templars.*`) ne bougent pas non plus : ce sont du texte d'interface,
 * hors du périmètre de ce bloc. Ils servent seulement de graine au nom de la
 * ligne, ci-dessous.
 */
export type TemplarPresentationRow = {
  image: string;
  name: LocalizedField;
  description: LocalizedField;
  temple_base: string;
  bonus: string;
};

export type TemplarPresentationCatalog = Record<
  TemplarKey,
  TemplarPresentationRow
>;

// Bloc 127 (PR 2/3): the Nom field is now an **override** of the competence
// name, not a copy of it.
//
// The five names are already confirmed and translated in all five languages
// (`game.templars.<key>` in messages/*.json). Until this bloc the catalogue
// seeded a French and an English copy of them, because it could hold nothing
// else — and a German visitor therefore read the English one. Seeding the five
// languages instead would have written the launch list into this file, which
// `src/i18n/launch-locales-derivation.test.ts` forbids for a reason: a record
// keyed by locale is exactly what silently stripped a new language twice
// before (Bloc 120).
//
// So the row ships with no name at all, and the screens read
// `game.templars.<key>` when the override is empty — the tile, the admin
// placeholder and every aria-label alike. Adding a language to messages/ now
// translates these five names with nothing else to do, and an admin who wants
// another word writes it in the language they mean.

// Bloc 68/B: the 5 real illustrations delivered to public/templars/,
// wired in as the seed default — same convention as every other
// reference's default catalog (e.g. defaultConsumableCatalog), never a
// per-admin upload.
const defaultImages: Record<TemplarKey, string> = {
  striker: "/templars/templar-striker.webp",
  guardian: "/templars/templar-guardian.webp",
  prosperous: "/templars/templar-prosperous.webp",
  recruiter: "/templars/templar-recruiter.webp",
  rusher: "/templars/templar-rusher.webp",
};

// Base Temple / Bonus are seeded from the already-confirmed templeBase /
// templarRates constants (player-settings.ts, gems-templars.ts) — copying
// known values into this catalog's default, never inventing new ones. From
// here on they're admin-editable like every other field on this row.
export const defaultTemplarPresentationCatalog: TemplarPresentationCatalog =
  Object.fromEntries(
    templarKeys.map((key) => [
      key,
      {
        image: defaultImages[key],
        // Vide : le nom de compétence traduit fait foi tant que
        // l'administration n'écrit pas autre chose.
        name: {},
        // Rien n'est livré ici : la description s'écrit en administration, et
        // une langue non écrite reste absente plutôt que vide (Bloc 126/D).
        description: {},
        temple_base: String(templeBase[key]),
        bonus: String(templarRates[key]),
      } satisfies TemplarPresentationRow,
    ]),
  ) as TemplarPresentationCatalog;
