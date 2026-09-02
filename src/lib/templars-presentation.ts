import { templarKeys, templeBase, type TemplarKey } from "./player-settings";
import { templarRates } from "./gems-templars";

// Bloc 66/B: the presentation catalog behind the new tile section — one
// row per Templar, editable in admin (Image, Nom, Description, Base
// Temple, Bonus) but never wired back into the real cost formula
// (templar-parameters.ts) or the templeBase/templarRates constants below,
// which the actual calculators keep reading directly. This is display
// content only.
export type TemplarPresentationRow = {
  image: string;
  name_fr: string;
  name_en: string;
  description_fr: string;
  description_en: string;
  temple_base: string;
  bonus: string;
};

export type TemplarPresentationCatalog = Record<
  TemplarKey,
  TemplarPresentationRow
>;

export const emptyTemplarPresentationRow: TemplarPresentationRow = {
  image: "",
  name_fr: "",
  name_en: "",
  description_fr: "",
  description_en: "",
  temple_base: "",
  bonus: "",
};

// The 5 competence names are already fully confirmed and translated
// (game.templars.<key>, all 5 locales) — reused here as the Nom seed
// rather than left blank, since it's already-known content, not invented.
// Only fr/en are captured (same as every other reference's admin-editable
// item text): the public tile falls back to these two exactly like
// Boutique (pickLocaleText).
const defaultNames: Record<TemplarKey, { fr: string; en: string }> = {
  striker: { fr: "Attaque", en: "Attack" },
  guardian: { fr: "Défense", en: "Defense" },
  prosperous: { fr: "Or", en: "Gold" },
  recruiter: { fr: "Recruteur", en: "Recruiter" },
  rusher: { fr: "Vitesse", en: "Speed" },
};

// Base Temple / Bonus are seeded from the already-confirmed templeBase /
// templarRates constants (player-settings.ts, gems-templars.ts) — copying
// known values into this new display catalog, never inventing new ones.
export const defaultTemplarPresentationCatalog: TemplarPresentationCatalog =
  Object.fromEntries(
    templarKeys.map((key) => [
      key,
      {
        image: "",
        name_fr: defaultNames[key].fr,
        name_en: defaultNames[key].en,
        description_fr: "",
        description_en: "",
        temple_base: String(templeBase[key]),
        bonus: String(templarRates[key]),
      } satisfies TemplarPresentationRow,
    ]),
  ) as TemplarPresentationCatalog;
