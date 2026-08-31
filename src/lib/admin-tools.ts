// Bloc 33/G: Templars' reference ("templiers") now has its own row and its
// own independent active flag, same as the other 3 — deactivating the
// reference no longer deactivates the shared public Templars tool, and
// vice versa. Only the formula params (base/ratio) and their edit point
// stay shared, via adminToolEditHref below.
export const referenceToolSlugs = [
  "combat-equipment",
  "expedition-equipment",
  "level-up",
  "templiers",
  "gemmes",
  // Bloc 43: no matching "tool" row — adminToolEditHref returns undefined
  // for it below, same as combat-equipment/expedition-equipment/level-up,
  // so it falls through to /admin/guides/reference-consumables.
  "consumables",
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
  // Bloc 35/7.1: carries provenance through the URL, so the editor's back
  // button returns to Guides — not just to whichever page a guides_manager
  // (no calculators.read) can actually reach.
  if (slug === "templiers") return "/admin/tools/templars?from=guides";
  if (slug === "xp-gain-rate") return "/admin/tools/xp-gain-rate";
  if (slug === "demo-attack-troops") return "/admin/tools/demo-attack-troops";
  if (slug === "gems") return "/admin/tools/gems";
  // Bloc 36/A: same shared-edit-point pattern as "templiers" above — the
  // Gems reference reuses the tool's editor, carrying provenance through
  // the URL so its own "Retour" returns to Guides.
  if (slug === "gemmes") return "/admin/tools/gems?from=guides";
  return undefined;
}
