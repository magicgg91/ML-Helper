"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Locale = "fr" | "en";
type LocaleDraft = { title: string; excerpt: string; content: string };
type GuideDraft = {
  id?: string;
  slug: string;
  category: string;
  coverImage: string;
  status: string;
  translations: Record<Locale, LocaleDraft>;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export function GuideEditor({
  initial,
  canPublish,
}: {
  initial: GuideDraft;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [id, setId] = useState(initial.id);
  const [locale, setLocale] = useState<Locale>("fr");
  const [status, setStatus] = useState(initial.status);
  const [message, setMessage] = useState("");
  const [translations, setTranslations] = useState(initial.translations);

  function updateLocale(patch: Partial<LocaleDraft>) {
    setTranslations((current) => ({
      ...current,
      [locale]: { ...current[locale], ...patch },
    }));
  }

  async function save(nextStatus?: "pending_review" | "published" | "draft") {
    setMessage("Enregistrement…");
    const generatedSlug =
      initial.slug || slugify(translations.fr.title || translations.en.title);
    if (!generatedSlug) {
      setMessage("Saisis un titre FR ou EN avant d’enregistrer.");
      return;
    }
    const response = await fetch(
      id ? `/api/admin/guides/${id}` : "/api/admin/guides",
      {
        method: id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: generatedSlug,
          category: initial.category,
          coverImage: initial.coverImage,
          translations,
        }),
      },
    ).catch(() => null);
    if (!response?.ok) {
      const error = response ? await response.json().catch(() => null) : null;
      setMessage(
        error?.error === "slug_already_exists"
          ? "Un guide utilise déjà ce titre/slug."
          : "Le guide contient des champs invalides ou incomplets.",
      );
      return;
    }
    const saved = await response.json();
    const guideId = id ?? saved.id;
    setId(guideId);
    if (nextStatus) {
      const statusResponse = await fetch(
        `/api/admin/guides/${guideId}/status`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      if (!statusResponse.ok) {
        setMessage(
          "Guide enregistré, mais ton rôle ne permet pas ce changement de statut.",
        );
        return;
      }
      setStatus(nextStatus);
    }
    setMessage("Guide enregistré.");
    if (!id) router.replace(`/admin/guides/${guideId}`);
    router.refresh();
  }

  const draft = translations[locale];
  return (
    <div className="guide-editor">
      <nav className="tabs" aria-label="Langue du guide">
        {(["fr", "en"] as const).map((key) => (
          <button
            type="button"
            key={key}
            aria-current={locale === key ? "page" : undefined}
            onClick={() => setLocale(key)}
          >
            {key.toUpperCase()}
          </button>
        ))}
      </nav>
      <section className="admin-panel guide-simple-fields">
        <label>
          Titre ({locale.toUpperCase()})
          <input
            value={draft.title}
            onChange={(event) => updateLocale({ title: event.target.value })}
          />
        </label>
        <label>
          Résumé ({locale.toUpperCase()})
          <input
            value={draft.excerpt}
            maxLength={320}
            onChange={(event) => updateLocale({ excerpt: event.target.value })}
          />
        </label>
        <label>
          Contenu Markdown ({locale.toUpperCase()})
          <textarea
            className="guide-markdown-input"
            value={draft.content}
            onChange={(event) => updateLocale({ content: event.target.value })}
            spellCheck
          />
        </label>
      </section>
      <div className="admin-actions">
        <button type="button" onClick={() => save()}>
          Enregistrer
        </button>
        {status !== "pending_review" && status !== "published" && (
          <button type="button" onClick={() => save("pending_review")}>
            Soumettre en review
          </button>
        )}
        {canPublish && status !== "published" && (
          <button type="button" onClick={() => save("published")}>
            Publier
          </button>
        )}
        {canPublish && status === "published" && (
          <button
            type="button"
            className="secondary-action"
            onClick={() => save("draft")}
          >
            Dépublier en brouillon
          </button>
        )}
      </div>
      {message && (
        <p className="form-status" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
