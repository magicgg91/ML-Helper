import { templarKeys, templeBase, type TemplarKey } from "./player-settings";
import { templarRates } from "./gems-templars";

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
        name_fr: defaultNames[key].fr,
        name_en: defaultNames[key].en,
        description_fr: "",
        description_en: "",
        temple_base: String(templeBase[key]),
        bonus: String(templarRates[key]),
      } satisfies TemplarPresentationRow,
    ]),
  ) as TemplarPresentationCatalog;
