"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import {
  toolDescriptionMaxLength,
  type ToolDescription,
} from "@/lib/tool-description";
import { launchLocales, type LaunchLocale } from "@/lib/translations";
import { AdminButton } from "./admin-button";
import { ConfirmDialog } from "./admin-confirm-dialog";
import { LangTabs } from "./admin-lang-tabs";
import { Pill } from "./admin-pill";
import { SidePanel } from "./admin-side-panel";
import { useSaveStatus } from "./use-save-status";
import { useUnsavedWarning } from "./use-unsaved-warning";

/**
 * Bloc 130: the one-line description of a tool or a reference, edited from
 * the row it belongs to.
 *
 * One panel for all eighteen records rather than a field grafted into each
 * edit screen. Two reasons, and the second is the one that settles it:
 *
 *  - half of them have no edit screen at all (a tool with no named numeric
 *    parameter keeps only its Visible switch — Récompenses de Production,
 *    Production, Niveau max de Ville…), so the edit screens could never have
 *    covered every record and the list would have needed this anyway;
 *  - the edit screens edit game parameters under one save (Bloc 119). A
 *    description is editorial content on another endpoint under another
 *    permission, and folding it into that save would put two resources
 *    behind one button.
 *
 * So it lives where every record is reachable and where its neighbour — the
 * Visible switch, in the same row — already lives.
 *
 * The languages are the site's, not the admin's. The admin chrome around the
 * field stays EN/FR like everywhere else (Bloc 118), while the field itself
 * offers every launch language, and says which of them the public cannot see
 * today (Bloc 125 §9). Those are two different things and this screen is
 * where they meet.
 */

export type DescriptionTarget = {
  slug: string;
  /** What the row is called on screen, for the panel's title. */
  label: string;
  description: ToolDescription;
};

export function DescriptionPanel({
  target,
  hiddenLocales,
  languageNames,
  onClose,
  onSaved,
}: {
  /** The row being described, or nothing when the panel is closed. */
  target: DescriptionTarget | undefined;
  hiddenLocales?: readonly string[];
  languageNames?: Partial<Record<string, string>>;
  onClose: () => void;
  /** The stored value, so the list can show it without a round trip. */
  onSaved: (slug: string, description: ToolDescription) => void;
}) {
  const t = useTranslations("admin.descriptions");
  const editor = useTranslations("admin.editor");
  const [locale, setLocale] = useState<LaunchLocale>("fr");
  // Keyed on the row being edited: opening another one — or the same one
  // again — starts from its own stored text rather than from what the
  // previous panel was showing.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string>();
  const status = useSaveStatus();
  const fieldId = useId();
  const [leaving, setLeaving] = useState(false);

  // Re-seeded on every open cycle, not once per row: `editing` is cleared
  // when the panel closes, so reopening the same row starts from what is
  // stored. Keeping the slug across a close made a cancelled draft come
  // back — Cancel, Escape and the backdrop all leave the panel mounted, and
  // the next save would have persisted text the admin had discarded.
  if (target?.slug !== editing) {
    setEditing(target?.slug);
    if (target) {
      setDraft(
        Object.fromEntries(
          launchLocales.map((code) => [code, target.description[code] ?? ""]),
        ),
      );
      setLocale("fr");
      status.reset();
    }
  }

  /**
   * Bloc 131/B : ce que le panneau tient et que le serveur n'a pas encore.
   *
   * Comparé langue par langue à ce qui est stocké, et non à ce que le champ
   * contenait à l'ouverture : retaper le texte d'origine ramène le panneau à
   * l'état propre, et fermer alors n'a rien à faire perdre.
   */
  const dirty = Boolean(
    target &&
    launchLocales.some(
      (code) => (draft[code] ?? "") !== (target.description[code] ?? ""),
    ),
  );

  // La moitié que le Bloc 119 pose sur les écrans d'édition : l'onglet fermé
  // ou un lien suivi pendant que le panneau est ouvert demandent aussi.
  useUnsavedWarning(dirty, editor("leave-warning"));

  /**
   * Toute sortie qui perdrait le travail passe par une question — le fond,
   * Échap, la croix et Annuler. Les quatre veulent dire la même chose,
   * « ferme sans enregistrer », et distinguer celle qui demande de celles
   * qui ne demandent pas ferait dépendre la sécurité du geste employé. Sans
   * modification, aucune des quatre ne demande quoi que ce soit.
   */
  function requestClose() {
    // La question est déjà posée. Les deux surfaces écoutent Échap sur le
    // document : sans cette ligne, l'ordre où les écouteurs ont été posés
    // déciderait du résultat — inversé, la question se refermerait puis se
    // rouvrirait dans le même lot d'états, et Échap ne pourrait plus jamais
    // la fermer.
    if (leaving) return;
    if (dirty) return setLeaving(true);
    onClose();
  }

  async function save() {
    if (!target) return;
    status.pending(editor("saving"));
    const response = await fetch(
      `/api/admin/calculators/${target.slug}/description`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: draft }),
      },
    ).catch(() => null);
    if (!response?.ok) {
      status.error(editor("error", { status: response?.status ?? 0 }));
      return;
    }
    const stored = (await response.json().catch(() => null)) as {
      description?: ToolDescription;
    } | null;
    onSaved(target.slug, stored?.description ?? {});
    status.success(editor("saved"));
  }

  const value = draft[locale] ?? "";

  return (
    <>
      <SidePanel
        open={Boolean(target)}
        title={t("title", { name: target?.label ?? "" })}
        description={t("subtitle")}
        onClose={requestClose}
        footer={
          <>
            {dirty && <Pill tone="warn">{editor("unsaved")}</Pill>}
            <AdminButton type="button" onClick={requestClose}>
              {editor("cancel")}
            </AdminButton>
            <AdminButton type="button" variant="primary" onClick={save}>
              {editor("save")}
            </AdminButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <LangTabs
            locale={locale}
            onChange={setLocale}
            // Dashed until something is written in it, so an admin sees at a
            // glance which languages the description is still missing.
            filled={(code) => Boolean((draft[code] ?? "").trim())}
            label={t("languages-label")}
            languageNames={languageNames}
            hiddenLocales={hiddenLocales}
            hiddenLabel={(language) => t("language-hidden", { language })}
          />
          <label className="flex flex-col gap-1" htmlFor={fieldId}>
            <span className="text-xs font-medium text-admin-dim">
              {t("field", { language: locale.toUpperCase() })}
            </span>
            <textarea
              id={fieldId}
              className="admin-control admin-focus min-h-[76px] resize-y rounded-admin-control border border-admin-card-border bg-admin-card px-2 py-1.5 font-admin-body text-[13px] leading-[1.6] text-admin-text"
              maxLength={toolDescriptionMaxLength}
              value={value}
              placeholder={t("placeholder")}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  [locale]: event.target.value,
                }))
              }
            />
            <span className="text-xs text-admin-dim">
              {t("counter", {
                count: value.length,
                max: toolDescriptionMaxLength,
              })}
            </span>
          </label>
          {status.message && (
            <p className="text-sm text-admin-dim" role="status">
              {status.message}
            </p>
          )}
        </div>
      </SidePanel>
      {/* Sœur du panneau, pas son enfant : une question *sur* le travail en
          cours passe devant l'endroit où il se fait (Bloc 125 §3), et une
          boîte de dialogue n'a rien à faire dans la zone qui défile. */}
      <ConfirmDialog
        open={leaving}
        title={t("leave-title")}
        description={t("leave-body")}
        confirmLabel={t("leave-confirm")}
        onCancel={() => setLeaving(false)}
        onConfirm={() => {
          setLeaving(false);
          onClose();
        }}
      />
    </>
  );
}
