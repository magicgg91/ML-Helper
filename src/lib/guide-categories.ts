export const guideCategories = [
  "debuter",
  "combat",
  "defense",
  "competences",
  "equipement",
  "expeditions",
  "evenements",
  "clan",
] as const;

export type GuideCategory = (typeof guideCategories)[number];

function isGuideCategory(value: unknown): value is GuideCategory {
  return guideCategories.includes(value as GuideCategory);
}

export function parseGuideCategories(value: unknown): GuideCategory[] {
  if (Array.isArray(value)) return value.filter(isGuideCategory);
  if (typeof value !== "string") return [];
  const legacy =
    value === "debutants"
      ? "debuter"
      : value === "stuff"
        ? "equipement"
        : value;
  return isGuideCategory(legacy) ? [legacy] : [];
}
