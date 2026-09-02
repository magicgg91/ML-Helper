import { templarKeys, type TemplarKey } from "./player-settings";

// Bloc 66/B: the presentation catalog behind the new tile section — one
// row per Templar, editable in admin (Image, Nom, Description). Base
// Temple and Bonus are shown on the same tile but are NOT part of this
// catalog: Codex review (PR #85) flagged that a separately-stored copy of
// those two numbers could drift from the templeBase/templarRates
// constants the real calculators read (player-settings-panel.tsx,
// skills-calculators.tsx, totalTempleBonus()) — an admin editing the copy
// here would make the reference lie about actual gameplay. Both values are
// computed straight from those constants wherever they're displayed
// (templars-reference.tsx, templars-presentation-editor.tsx), so there is
// only ever one source for them.
export type TemplarPresentationRow = {
  image: string;
  name_fr: string;
  name_en: string;
  description_fr: string;
  description_en: string;
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
      } satisfies TemplarPresentationRow,
    ]),
  ) as TemplarPresentationCatalog;
