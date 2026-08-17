const actions: Record<string, string> = {
  setup: "a créé le premier compte Super Admin",
  create: "a créé",
  update: "a modifié",
  delete: "a supprimé",
  activate: "a activé",
  deactivate: "a désactivé",
  publish: "a publié",
  unpublish: "a dépublié",
  update_status: "a changé le statut de",
  submit_review: "a soumis en validation",
  update_translations: "a modifié les traductions de",
  change_password: "a changé le mot de passe de",
  purge: "a purgé",
};

export function auditMessage(actor: string, action: string, target: string) {
  return `${actor} ${actions[action] ?? "a modifié"} ${target}`.trim();
}
