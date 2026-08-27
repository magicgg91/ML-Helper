export const referenceToolSlugs = [
  "combat-equipment",
  "expedition-equipment",
  "level-up",
] as const;
// Templars (cdc section 6, décision Bloc 3) has no lookup_table of its own:
// its reference is the same 2 formula_params (base, ratio) already edited
// via the calculator's own tool editor. It still needs a row in the Guides
// admin reference list, but — unlike the 3 slugs above — must stay listed
// (and editable) in the Outils admin table too, so it's tracked separately
// rather than folded into referenceToolSlugs.
export const formulaGuideReferenceSlugs = ["templars"] as const;
export const guideReferenceSlugs = [
  ...referenceToolSlugs,
  ...formulaGuideReferenceSlugs,
] as const;
export const cityToolSlugs = [
  "city-cost",
  "city-max-level",
  "city-production",
] as const;

// Returns undefined for tools with no named numeric parameters to edit
// (cdc section 8: admin only ever edits named numeric parameters, never a
// free-form formula) — those tools keep only the activate/deactivate action.
export function adminToolEditHref(slug: string): string | undefined {
  if (cityToolSlugs.includes(slug as (typeof cityToolSlugs)[number]))
    return "/admin/tools/city-parameters";
  if (slug === "ranking") return "/admin/tools/ranking";
  if (slug === "templars") return "/admin/tools/templars";
  if (slug === "xp-gain-rate") return "/admin/tools/xp-gain-rate";
  if (slug === "demo-attack-troops") return "/admin/tools/demo-attack-troops";
  if (slug === "gems") return "/admin/tools/gems";
  return undefined;
}
