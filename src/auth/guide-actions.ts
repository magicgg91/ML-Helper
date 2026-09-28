import { can } from "./permissions";

// Bloc 119: "toggle" is gone with the ⏻ button. A guide's visibility was a
// second flag next to its status; publishing and unpublishing it is now the
// only way to change what the public sees, and that is "publish".
export type GuideAction =
  "create" | "edit" | "submit_review" | "publish" | "delete";

export function canPerformGuideAction(
  role: string | undefined,
  action: GuideAction,
) {
  if (action === "publish") return can(role, "guides.publish");
  if (action === "delete") return can(role, "guides.delete");
  return can(role, "guides.write");
}
