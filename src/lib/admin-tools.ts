export const referenceToolSlugs = ["combat-equipment", "expedition-equipment"] as const;
export const cityToolSlugs = ["city-cost", "city-max-level", "city-production"] as const;

export function adminToolEditHref(id: string, slug: string) {
  if (cityToolSlugs.includes(slug as (typeof cityToolSlugs)[number]))
    return "/admin/tools/city-parameters";
  if (slug === "ranking") return "/admin/tools/ranking";
  if (slug === "templars") return "/admin/tools/templars";
  return `/admin/tools/${id}`;
}

