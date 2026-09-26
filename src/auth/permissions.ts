import type { AdminRole } from "./roles";

const adminCapabilities = [
  "dashboard.view",
  "users.read",
  "users.manage",
  "logs.view",
  "logs.purge",
  "guides.read",
  "guides.write",
  "guides.publish",
  "guides.delete",
  "calculators.read",
  "calculators.write",
  "calculators.toggle",
  "references.read",
  "references.write",
  "content.read",
  "content.write",
  // Bloc 90: the admin Configuration tab (language visibility). Restricted to
  // super_admin (all) and admin (via the filter below) — the 4 manager/read
  // roles have explicit capability sets that never include it.
  "configuration.read",
  "configuration.write",
  // Bloc 135 : les ligues et les divisions, dont le CRUD a quitté l'écran de
  // l'outil Classement pour Configuration. Une capacité à part, et non
  // `configuration.*`, pour une raison précise : le rôle « Gestion Outils »
  // pouvait éditer l'échelle quand elle vivait sous `calculators.write`, et le
  // déplacement ne doit pas la lui retirer — alors qu'il n'a rien à faire dans
  // les langues du site ni dans la sélection de l'accueil, qui sont sur le même
  // écran. C'est ce qui permet à /admin/config de s'ouvrir sur la seule section
  // qu'un rôle a le droit de voir.
  "leagues.read",
  "leagues.write",
  // Bloc 100, revue Codex (PR #127): configuring a remote script URL is not
  // the same power as the rest of Configuration. The script runs in this
  // origin, with a valid nonce, on every page — including the ones a Super
  // Admin loads — so whoever sets it can act as any administrator who then
  // browses the site. That would hand `admin` the users.manage and
  // content.write it is deliberately denied below, so it is super_admin only.
  "configuration.scripts",
] as const;

export type AdminCapability = (typeof adminCapabilities)[number];

const all = new Set<AdminCapability>(adminCapabilities);
const matrix: Record<AdminRole, ReadonlySet<AdminCapability>> = {
  super_admin: all,
  admin: new Set(
    adminCapabilities.filter(
      (item) =>
        item !== "users.manage" &&
        item !== "logs.purge" &&
        item !== "content.read" &&
        item !== "content.write" &&
        item !== "configuration.scripts",
    ),
  ),
  guides_manager: new Set(["dashboard.view", "guides.read", "guides.write"]),
  references_manager: new Set([
    "dashboard.view",
    "references.read",
    "references.write",
  ]),
  tools_manager: new Set([
    "dashboard.view",
    "calculators.read",
    "calculators.write",
    "calculators.toggle",
    // Bloc 135 : ce que `calculators.write` couvrait tant que l'échelle vivait
    // sur /admin/tools/ranking.
    "leagues.read",
    "leagues.write",
  ]),
  // Bloc 59/B: read_only is strictly limited to Dashboard/Tools/Références/
  // Guides in read-only — no Historique, no Utilisateurs (neither the nav
  // link nor a direct URL), and no indirect exposure of the audit history
  // via the dashboard's "dernières actions" section (gated by logs.view).
  read_only: new Set([
    "dashboard.view",
    "guides.read",
    "calculators.read",
    "references.read",
  ]),
};

export function can(role: string | undefined, capability: AdminCapability) {
  return Boolean(role && matrix[role as AdminRole]?.has(capability));
}
