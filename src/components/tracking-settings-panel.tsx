"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "./admin-button";
import { useSectionDirty } from "./admin-collapsible-section";
import { useUnsavedWarning } from "./use-unsaved-warning";

// Bloc 100/A: the visit-tracking script URL. Deliberately generic — the field
// takes any script URL, and nothing in the site knows which analytics tool is
// behind it. Leaving it empty is how tracking is turned off: nothing is
// injected by default.
//
// Bloc 101: plus the identifier the tag carries next to its src
// (data-website-id for Umami). Optional on purpose — some trackers need none.
export function TrackingSettingsPanel({
  url,
  websiteId,
}: {
  url: string;
  websiteId: string;
}) {
  const t = useTranslations("admin.config.tracking");
  const editor = useTranslations("admin.editor");
  const router = useRouter();
  const [value, setValue] = useState(url);
  const [id, setId] = useState(websiteId);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  /**
   * Bloc 136 : ce que ce panneau tient et que le serveur n'a pas encore.
   *
   * Comparé à ce qui est enregistré, et non aux valeurs reçues au chargement
   * : la route normalise ce qu'elle stocke (Bloc 100/A), et le panneau adopte
   * sa réponse. Sans cette copie, une URL réécrite à l'enregistrement
   * laisserait le panneau « modifié » pour toujours.
   *
   * Deux usages, la même mesure — la pastille quand la section est repliée,
   * et la question posée en quittant la page.
   */
  const [saved, setSaved] = useState({ url, websiteId });
  const dirty = value !== saved.url || id !== saved.websiteId;
  useSectionDirty(dirty);
  useUnsavedWarning(dirty, editor("leave-warning"));

  async function save() {
    setSaving(true);
    setMessage(t("saving"));
    try {
      const response = await fetch("/api/admin/config/tracking", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: value, websiteId: id }),
      });
      if (!response.ok) {
        // The route refuses anything that is not a usable http(s) URL, or an
        // identifier that is not one, so a typo is named as such instead of
        // being reported as a server error.
        if (response.status === 400) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          setMessage(
            body?.error === "invalid_website_id"
              ? t("invalid-website-id")
              : t("invalid-url"),
          );
          return;
        }
        setMessage(t("save-error", { status: response.status }));
        return;
      }
      const stored = (await response.json()) as {
        url: string;
        websiteId: string;
      };
      setValue(stored.url);
      setId(stored.websiteId);
      setSaved(stored);
      setMessage(stored.url ? t("saved") : t("cleared"));
      // Revue Codex (PR #156), même raison que pour les langues : la pastille
      // « Script actif » / « Aucun script » est calculée sur le serveur, et
      // resterait sur son ancienne valeur une fois la section repliée.
      router.refresh();
    } catch {
      setMessage(t("server-error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold" htmlFor="tracking-url">
          {t("label")}
        </label>
        {/* Bloc 119: a script URL and a site identifier are code, not prose —
            the two places besides times and language codes where the mono
            face earns its keep (§1). */}
        <input
          id="tracking-url"
          name="tracking-url"
          type="url"
          inputMode="url"
          className="admin-control admin-focus h-[var(--admin-control-h)] rounded-admin-control border border-admin-card-border bg-admin-card px-3 font-admin-mono text-sm text-admin-text"
          placeholder={t("placeholder")}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <p className="text-xs text-admin-dim">{t("hint")}</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold" htmlFor="tracking-website-id">
          {t("website-id-label")}
        </label>
        <input
          id="tracking-website-id"
          name="tracking-website-id"
          type="text"
          className="admin-control admin-focus h-[var(--admin-control-h)] rounded-admin-control border border-admin-card-border bg-admin-card px-3 font-admin-mono text-sm text-admin-text"
          placeholder={t("website-id-placeholder")}
          value={id}
          onChange={(event) => setId(event.target.value)}
        />
        <p className="text-xs text-admin-dim">{t("website-id-hint")}</p>
      </div>

      <div className="flex items-center gap-3">
        <AdminButton variant="primary" onClick={save} disabled={saving}>
          {t("save")}
        </AdminButton>
        {message && (
          <p className="text-sm text-admin-dim" role="status">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
