"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { guideCategories, type GuideCategory } from "../lib/guide-categories";
import { GuideMarkdownEditor } from "./guide-markdown-editor";

type Locale = "fr" | "en";
type LocaleDraft = { title: string; excerpt: string; content: string };
type GuideDraft = {
  id?: string;
  slug: string;
  category: GuideCategory[];
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
  const t = useTranslations("admin.guide-editor");
  const [id, setId] = useState(initial.id);
  const [locale, setLocale] = useState<Locale>("fr");
  const [status, setStatus] = useState(initial.status);
  const [message, setMessage] = useState("");
  const [translations, setTranslations] = useState(initial.translations);
  const [categories, setCategories] = useState(initial.category);
  const [coverImage, setCoverImage] = useState(initial.coverImage);

  function updateLocale(patch: Partial<LocaleDraft>) {
    setTranslations((current) => ({
      ...current,
      [locale]: { ...current[locale], ...patch },
    }));
  }

  async function save(nextStatus?: "pending_review" | "published" | "draft") {
    setMessage(t("saving"));
    const generatedSlug =
      initial.slug || slugify(translations.fr.title || translations.en.title);
    if (!generatedSlug) {
      setMessage(t("missing-title"));
      return;
    }
    if (!categories.length) {
      setMessage(t("missing-category"));
      return;
    }
    const response = await fetch(
      id ? `/api/admin/guides/${id}` : "/api/admin/guides",
      {
        method: id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: generatedSlug,
          category: categories,
          coverImage,
          translations,
        }),
      },
    ).catch(() => null);
    if (!response?.ok) {
      const error = response ? await response.json().catch(() => null) : null;
      setMessage(
        error?.error === "slug_already_exists"
          ? t("duplicate-slug")
          : t("invalid"),
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
        setMessage(t("status-forbidden"));
        return;
      }
      setStatus(nextStatus);
    }
    setMessage(t("saved"));
    if (!id) window.history.replaceState(null, "", `/admin/guides/${guideId}`);
  }

  const draft = translations[locale];
  return (
    <div className="guide-editor">
      <nav className="tabs" aria-label={t("language-label")}>
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
        <fieldset className="guide-category-selector">
          <legend>{t("categories-label")}</legend>
          {guideCategories.map((category) => (
            <label key={category}>
              <input
                type="checkbox"
                checked={categories.includes(category)}
                onChange={(event) =>
                  setCategories((current) =>
                    event.target.checked
                      ? [...current, category]
                      : current.filter((item) => item !== category),
                  )
                }
              />
              {t(`categories.${category}`)}
            </label>
          ))}
        </fieldset>
        <label>
          {t("cover-image")}
          <input
            type="url"
            value={coverImage}
            placeholder={t("cover-image-placeholder")}
            onChange={(event) => setCoverImage(event.target.value)}
          />
        </label>
        {coverImage && (
          // eslint-disable-next-line @next/next/no-img-element -- Admin preview accepts an arbitrary validated URL.
          <img
            className="guide-cover-preview"
            src={coverImage}
            alt={t("cover-image-preview")}
          />
        )}
        <label>
          {t("title", { locale: locale.toUpperCase() })}
          <input
            value={draft.title}
            onChange={(event) => updateLocale({ title: event.target.value })}
          />
        </label>
        <label>
          {t("excerpt", { locale: locale.toUpperCase() })}
          <input
            value={draft.excerpt}
            maxLength={320}
            onChange={(event) => updateLocale({ excerpt: event.target.value })}
          />
        </label>
        <GuideMarkdownEditor
          label={t("content", { locale: locale.toUpperCase() })}
          previewLabel={t("preview")}
          value={draft.content}
          onChange={(content) => updateLocale({ content })}
        />
      </section>
      <div className="admin-actions">
        <button type="button" onClick={() => save()}>
          {t("save")}
        </button>
        {status !== "pending_review" && status !== "published" && (
          <button type="button" onClick={() => save("pending_review")}>
            {t("submit-review")}
          </button>
        )}
        {canPublish && status !== "published" && (
          <button type="button" onClick={() => save("published")}>
            {t("publish")}
          </button>
        )}
        {canPublish && status === "published" && (
          <button
            type="button"
            className="secondary-action"
            onClick={() => save("draft")}
          >
            {t("unpublish")}
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
