import { can } from "./permissions";

export type GuideAction =
  "create" | "edit" | "toggle" | "submit_review" | "publish" | "delete";

export function canPerformGuideAction(
  role: string | undefined,
  action: GuideAction,
) {
  if (action === "publish") return can(role, "guides.publish");
  if (action === "delete") return can(role, "guides.delete");
  return can(role, "guides.write");
}
