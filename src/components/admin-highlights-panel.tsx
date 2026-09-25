"use client";

import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AdminButton } from "./admin-button";
import { useSectionDirty } from "./admin-collapsible-section";
import { Pill } from "./admin-pill";
import { RowActions } from "./admin-row-actions";
import { useSaveStatus } from "./use-save-status";
import {
  maxHomeHighlights,
  type HomeHighlight,
  type HomeHighlightKind,
} from "@/lib/home-highlights";

/**
 * Bloc 132 §4 : le panneau « Mis en avant » de l'écran Configuration.
 *
 * Ce qu'on peut choisir — guides, outils et référentiels visibles — est
 * calculé côté serveur et arrive déjà traduit et trié : l'écran n'a qu'à
 * montrer, filtrer et ordonner.
 */
export type HighlightCandidate = {
  kind: HomeHighlightKind;
  slug: string;
  name: string;
};

const keyOf = (entry: { kind: HomeHighlightKind; slug: string }) =>
  `${entry.kind}:${entry.slug}`;

export function AdminHighlightsPanel({
  candidates,
  initial,
}: {
  candidates: HighlightCandidate[];
  /**
   * La sélection enregistrée, ou `undefined` si personne n'a encore choisi.
   *
   * Retour de revue : les deux ne veulent pas dire la même chose et ne
   * doivent pas arriver ici confondus. Rien d'enregistré, c'est l'accueil
   * sur sa liste de repli ; une liste vide enregistrée, c'est le panneau
   * masqué exprès. Écrasés en `[]`, une installation neuve et un panneau
   * volontairement masqué s'affichaient pareil, et le message d'état
   * annonçait le repli alors qu'il ne s'appliquait plus.
   */
  initial: HomeHighlight[] | undefined;
}) {
  const t = useTranslations("admin.config.highlights");
  const [selected, setSelected] = useState<HomeHighlight[]>(initial ?? []);
  /**
   * Bloc 136 : la sélection telle qu'elle est enregistrée, pour savoir si
   * celle affichée s'en écarte. Comparée en JSON parce que l'ordre compte
   * autant que le contenu — remonter une entrée est une modification.
   */
  const [saved, setSaved] = useState<HomeHighlight[]>(initial ?? []);
  useSectionDirty(JSON.stringify(selected) !== JSON.stringify(saved));
  // Vrai dès qu'une sélection est enregistrée — au chargement, ou après un
  // enregistrement réussi dans cet écran.
  const [configured, setConfigured] = useState(initial !== undefined);
  const [query, setQuery] = useState("");
  const status = useSaveStatus();

  const byKey = useMemo(
    () => new Map(candidates.map((candidate) => [keyOf(candidate), candidate])),
    [candidates],
  );
  const chosen = new Set(selected.map(keyOf));
  const full = selected.length >= maxHomeHighlights;

  const needle = query.trim().toLocaleLowerCase();
  const available = candidates.filter(
    (candidate) =>
      !chosen.has(keyOf(candidate)) &&
      (!needle || candidate.name.toLocaleLowerCase().includes(needle)),
  );

  function move(index: number, delta: number) {
    setSelected((current) => {
      const next = [...current];
      const [entry] = next.splice(index, 1);
      next.splice(index + delta, 0, entry);
      return next;
    });
  }

  async function save() {
    status.pending(t("saving"));
    try {
      const response = await fetch("/api/admin/config/highlights", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ highlights: selected }),
      });
      if (response.ok) {
        setConfigured(true);
        setSaved(selected);
      }
      status.settle(response.ok, {
        success: t("saved"),
        error: t("save-error", { status: response.status }),
      });
    } catch {
      status.error(t("server-error"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Pill tone={selected.length ? "ok" : "neutral"}>
          {t("count", { count: selected.length, max: maxHomeHighlights })}
        </Pill>
        {full && <span className="text-sm text-admin-dim">{t("full")}</span>}
      </div>

      {selected.length === 0 ? (
        <p className="text-sm text-admin-dim">
          {t(configured ? "empty-hidden" : "empty")}
        </p>
      ) : (
        <ol className="flex flex-col gap-2" data-testid="highlights-selected">
          {selected.map((entry, index) => {
            const candidate = byKey.get(keyOf(entry));
            // Une entrée dont la cible a disparu reste visible et retirable :
            // la masquer la rendrait impossible à enlever, et elle occuperait
            // une des cinq places sans qu'on sache laquelle.
            const name = candidate?.name ?? entry.slug;
            return (
              <li
                className="flex items-center gap-3 rounded-admin-control border border-admin-card-border bg-admin-card px-3 py-2"
                key={keyOf(entry)}
              >
                <span className="font-admin-mono text-xs text-admin-dim">
                  {index + 1}
                </span>
                <Pill tone="neutral">{t(`kinds.${entry.kind}`)}</Pill>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {name}
                </span>
                <RowActions
                  name={name}
                  isFirst={index === 0}
                  isLast={index === selected.length - 1}
                  onMoveUp={() => move(index, -1)}
                  onMoveDown={() => move(index, 1)}
                  onRemove={() =>
                    setSelected((current) =>
                      current.filter((_, position) => position !== index),
                    )
                  }
                />
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold" htmlFor="highlights-search">
          {t("search")}
        </label>
        <input
          id="highlights-search"
          type="search"
          className="admin-control admin-focus h-[var(--admin-control-h)] rounded-admin-control border border-admin-card-border bg-admin-card px-3 text-sm text-admin-text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {available.length === 0 ? (
          <p className="text-sm text-admin-dim">{t("no-match")}</p>
        ) : (
          <ul
            className="flex max-h-72 flex-col gap-1 overflow-y-auto"
            data-testid="highlights-candidates"
          >
            {available.map((candidate) => (
              <li
                className="flex items-center gap-3 rounded-admin-control px-2 py-1"
                key={keyOf(candidate)}
              >
                <Pill tone="neutral">{t(`kinds.${candidate.kind}`)}</Pill>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {candidate.name}
                </span>
                <AdminButton
                  size="sm"
                  aria-label={t("add-label", { name: candidate.name })}
                  disabled={full}
                  onClick={() =>
                    setSelected((current) => [
                      ...current,
                      { kind: candidate.kind, slug: candidate.slug },
                    ])
                  }
                >
                  <PlusIcon aria-hidden="true" />
                  {t("add")}
                </AdminButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-3">
        <AdminButton
          variant="primary"
          onClick={save}
          disabled={status.isPending}
        >
          {t("save")}
        </AdminButton>
        {status.message && (
          <p
            className={
              status.tone === "error"
                ? "text-sm text-admin-danger-ink"
                : "text-sm text-admin-dim"
            }
            role="status"
          >
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}
