"use client";

import { useTranslations } from "next-intl";
import type { ToolDescription } from "@/lib/tool-description";
import { launchLocales } from "@/lib/translations";
import { AdminButton } from "./admin-button";
import { LocaleChip } from "./admin-locale-chip";

/**
 * Bloc 130, puis Bloc 131/A : la colonne Description des tables Outils et
 * Référentiels.
 *
 * Elle disait combien de langues la description est écrite dans — « aucune
 * langue », « 3 langues ». Le compte répond à une question qu'on ne se pose
 * pas : devant la colonne, on veut savoir *lesquelles* manquent, et un
 * chiffre oblige à ouvrir le panneau pour l'apprendre. Une puce par langue,
 * pleine ou en pointillés, répond directement — et c'est déjà la façon dont
 * la liste des Guides montre ses traductions, d'où la même puce (LocaleChip)
 * et non une seconde.
 *
 * Un rôle qui ne peut pas écrire voit les puces sans le bouton, comme le
 * reste des deux tables traite un lecteur.
 */
export function DescriptionCell({
  row,
  canEdit,
  languageNames,
  onOpen,
}: {
  row: { label: string; description: ToolDescription };
  canEdit: boolean;
  /** Les cinq noms de langue, résolus côté serveur. */
  languageNames?: Partial<Record<string, string>>;
  onOpen: () => void;
}) {
  const t = useTranslations("admin.descriptions");
  const chips = (
    <span className="flex flex-wrap gap-1">
      {launchLocales.map((code) => {
        const written = Boolean((row.description[code] ?? "").trim());
        return (
          <LocaleChip
            key={code}
            code={code}
            written={written}
            label={t(written ? "locale-written" : "locale-missing", {
              language: languageNames?.[code] ?? code.toUpperCase(),
            })}
          />
        );
      })}
    </span>
  );
  if (!canEdit) return chips;
  return (
    <span className="inline-flex items-center gap-2">
      {chips}
      <AdminButton
        type="button"
        size="sm"
        aria-label={t("open", { name: row.label })}
        onClick={onOpen}
      >
        {t("column")}
      </AdminButton>
    </span>
  );
}
