import { can } from "./permissions";

export type GuideStatus = "draft" | "pending_review" | "published";

export function canChangeGuideStatus(
  role: string | undefined,
  from: GuideStatus,
  to: GuideStatus,
) {
  if (!can(role, "guides.write")) return false;
  if (from === "published" || to === "published")
    return can(role, "guides.publish");
  return true;
}
