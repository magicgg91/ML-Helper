"use client";

import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { formatAdminDate } from "@/lib/admin-dates";
import { guideCategories, type GuideCategory } from "@/lib/guide-categories";
import {
  markdownRehypePlugins,
  markdownRemarkPluginsWithBreaks,
} from "@/lib/markdown-plugins";
import { type LaunchLocale } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";
import { EditorHeader } from "./admin-editor-header";
import { AdminLocaleTabs } from "./admin-locale-tabs";
import { MarkdownModeSwitch, type MarkdownMode } from "./admin-markdown-modes";
import { Pill, type PillTone } from "./admin-pill";
import { GuideMarkdownEditor } from "./guide-markdown-editor";
import { useSaveStatus } from "./use-save-status";
import { useUnsavedWarning } from "./use-unsaved-warning";

/**
 * Bloc 119 §3 bis: the guide editor.
 *
 * What it changes is where things are. The content — the language, the title,
 * the summary, the body — is the screen; everything that describes the guide
 * rather than being it (its publication state, its categories, its cover) is
 * a column of cards beside it, instead of a folded block and a row of buttons
 * in the action bar.
 *
 * A language tab with nothing in it opens an empty form; the guide is created
 * in that language by the save, not by the click.
 */

export type LocaleDraft = { title: string; excerpt: string; content: string };

export type GuideDraft = {
  id?: string;
  slug: string;
  category: GuideCategory[];
  coverImage: string;
  status: string;
  translations: Record<LaunchLocale, LocaleDraft>;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

const statusTone: Record<string, PillTone> = {
  published: "ok",
  pending_review: "warn",
  draft: "neutral",
};

export function GuideEditor({
  initial,
  canPublish,
  languageNames,
  backHref,
  backLabel,
  author,
  createdAt,
  updatedAt,
  publicHref,
  initialLocale = "fr",
}: {
  initial: GuideDraft;
  canPublish: boolean;
  languageNames: Record<string, string>;
  backHref: string;
  backLabel: string;
  /**
   * Which language to open on. The guides list links a missing translation
   * as `?lang=de`, and that shortcut is only honest if the form opens there
   * (Codex review, PR #148).
   */
  initialLocale?: LaunchLocale;
  /** What the Publication card states about the guide, from the server. */
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Where the guide reads on the site — absent until it has a slug. */
  publicHref?: string;
}) {
  const t = useTranslations("admin.guide-editor");
  const editor = useTranslations("admin.editor");
  const locale = useLocale();
  const [id, setId] = useState(initial.id);
  const [contentLocale, setContentLocale] =
    useState<LaunchLocale>(initialLocale);
  const [mode, setMode] = useState<MarkdownMode>("live");
  const [status, setStatus] = useState(initial.status);
  const [form, setForm] = useState({
    translations: initial.translations,
    category: initial.category,
    coverImage: initial.coverImage,
  });
  const [saved, setSaved] = useState(form);
  const save = useSaveStatus();

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  useUnsavedWarning(dirty, editor("leave-warning"));

  const draft = form.translations[contentLocale];
  const title =
    form.translations.fr.title || form.translations.en.title || t("new-title");

  const updateLocale = (patch: Partial<LocaleDraft>) =>
    setForm((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [contentLocale]: { ...current.translations[contentLocale], ...patch },
      },
    }));

  async function submit(nextStatus?: "pending_review" | "published" | "draft") {
    save.pending(t("saving"));
    const generatedSlug =
      initial.slug ||
      slugify(form.translations.fr.title || form.translations.en.title);
    if (!generatedSlug) return save.error(t("missing-title"));
    if (!form.category.length) return save.error(t("missing-category"));
    const response = await fetch(
      id ? `/api/admin/guides/${id}` : "/api/admin/guides",
      {
        method: id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: generatedSlug,
          category: form.category,
          coverImage: form.coverImage,
          translations: form.translations,
        }),
      },
    ).catch(() => null);
    if (!response?.ok) {
      const error = response ? await response.json().catch(() => null) : null;
      return save.error(
        error?.error === "slug_already_exists"
          ? t("duplicate-slug")
          : t("invalid"),
      );
    }
    const stored = await response.json();
    const guideId = id ?? stored.id;
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
      if (!statusResponse.ok) return save.error(t("status-forbidden"));
      setStatus(nextStatus);
    }
    setSaved(form);
    save.success(t("saved"));
    if (!id) window.history.replaceState(null, "", `/admin/guides/${guideId}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <EditorHeader
        backHref={backHref}
        backLabel={backLabel}
        title={title}
        dirty={dirty}
        saving={save.isPending}
        onSave={() => submit()}
        onCancel={() => {
          setForm(saved);
          save.reset();
        }}
        message={save.message}
      />

      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AdminLocaleTabs
              locale={contentLocale}
              onChange={setContentLocale}
              filled={(code) =>
                Boolean(form.translations[code].title.trim()) ||
                Boolean(form.translations[code].content.trim())
              }
              label={t("language-label")}
              languageNames={languageNames}
              toCreateLabel={t("to-create")}
            />
            <MarkdownModeSwitch
              mode={mode}
              onChange={setMode}
              label={t("mode-label")}
              labels={{
                edit: t("mode-write"),
                live: t("mode-split"),
                preview: t("mode-preview"),
              }}
            />
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-admin-dim">
            {t("title", { locale: contentLocale.toUpperCase() })}
            <input
              className="admin-control admin-focus h-[42px] rounded-admin-control border border-admin-card-border bg-admin-card px-3 text-base font-semibold text-admin-text"
              type="text"
              value={draft.title}
              onChange={(event) => updateLocale({ title: event.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-admin-dim">
            {t("excerpt", { locale: contentLocale.toUpperCase() })}
            <textarea
              className="admin-control admin-focus min-h-[72px] resize-y rounded-admin-control border border-admin-card-border bg-admin-card px-3 py-2 text-sm text-admin-text"
              maxLength={320}
              value={draft.excerpt}
              onChange={(event) =>
                updateLocale({ excerpt: event.target.value })
              }
            />
            <span className="text-xs text-admin-dim">{t("excerpt-help")}</span>
          </label>

          <GuideMarkdownEditor
            label={t("content", { locale: contentLocale.toUpperCase() })}
            value={draft.content}
            onChange={(content) => updateLocale({ content })}
            mode={mode}
            // Bloc 119 §3 bis: the same single-line-break fix as the legal
            // notice, and the same plugins the public guide page runs — a
            // preview that renders differently from the page is not a
            // preview.
            remarkPlugins={markdownRemarkPluginsWithBreaks}
            rehypePlugins={markdownRehypePlugins}
          />
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-4 xl:w-[300px]">
          <section
            aria-label={t("publication")}
            className="flex flex-col gap-3 rounded-admin-card border border-admin-card-border bg-admin-card p-5"
          >
            <h2 className="admin-section-title text-admin-text">
              {t("publication")}
            </h2>
            <span>
              <Pill tone={statusTone[status] ?? "neutral"}>
                {t(`status.${status}`)}
              </Pill>
            </span>
            <dl className="flex flex-col gap-1 text-sm">
              {author && (
                <div className="flex justify-between gap-2">
                  <dt className="text-admin-dim">{t("author")}</dt>
                  <dd className="font-semibold text-admin-text">{author}</dd>
                </div>
              )}
              {createdAt && (
                <div className="flex justify-between gap-2">
                  <dt className="text-admin-dim">{t("created-at")}</dt>
                  <dd className="text-admin-text">
                    {formatAdminDate(createdAt, locale)}
                  </dd>
                </div>
              )}
              {updatedAt && (
                <div className="flex justify-between gap-2">
                  <dt className="text-admin-dim">{t("updated-at")}</dt>
                  <dd className="text-admin-text">
                    {formatAdminDate(updatedAt, locale)}
                  </dd>
                </div>
              )}
            </dl>
            {/* Codex review (PR #148): the public route serves published
                guides only, so this link 404s on a draft or one in review.
                It follows the live status, not the one the page loaded
                with, so publishing from this very card reveals it. */}
            {publicHref && status === "published" && (
              <AdminButton asChild size="sm">
                <Link
                  href={publicHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("view-on-site")}
                  <ExternalLinkIcon aria-hidden="true" />
                </Link>
              </AdminButton>
            )}
            {/* An author who cannot publish still needs a way to hand the
                guide on — the control the brief's card list does not mention
                but the role matrix does. */}
            {!canPublish &&
              status !== "pending_review" &&
              status !== "published" && (
                <AdminButton
                  type="button"
                  size="sm"
                  onClick={() => submit("pending_review")}
                >
                  {t("submit-review")}
                </AdminButton>
              )}
            {canPublish && (
              <AdminButton
                type="button"
                size="sm"
                variant={status === "published" ? "secondary" : "primary"}
                onClick={() =>
                  submit(status === "published" ? "draft" : "published")
                }
              >
                {t(status === "published" ? "back-to-draft" : "publish")}
              </AdminButton>
            )}
          </section>

          <section
            aria-label={t("categories-label")}
            className="flex flex-col gap-3 rounded-admin-card border border-admin-card-border bg-admin-card p-5"
          >
            <h2 className="admin-section-title text-admin-text">
              {t("categories-label")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {guideCategories.map((category) => {
                const selected = form.category.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={selected}
                    className={cn(
                      "admin-focus h-[var(--admin-pill-h)] rounded-full border px-2.5 text-xs font-semibold",
                      selected
                        ? "border-admin-accent bg-admin-accent-soft text-admin-accent-soft-ink"
                        : "border-admin-card-border text-admin-dim",
                    )}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        category: selected
                          ? current.category.filter((item) => item !== category)
                          : [...current.category, category],
                      }))
                    }
                  >
                    {t(`categories.${category}`)}
                  </button>
                );
              })}
            </div>
          </section>

          <section
            aria-label={t("cover-image")}
            className="flex flex-col gap-3 rounded-admin-card border border-admin-card-border bg-admin-card p-5"
          >
            <h2 className="admin-section-title text-admin-text">
              {t("cover-image")}
            </h2>
            {form.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- Admin preview of an arbitrary validated URL.
              <img
                alt={t("cover-image-preview")}
                className="w-full rounded-admin-control object-cover"
                src={form.coverImage}
              />
            ) : (
              <p className="rounded-admin-control border border-dashed border-admin-card-border px-3 py-6 text-center text-sm text-admin-dim">
                {t("no-cover-image")}
              </p>
            )}
            <label className="flex flex-col gap-1 text-xs font-medium text-admin-dim">
              {t("cover-image-url")}
              <input
                className="admin-control admin-focus h-9 rounded-admin-control border border-admin-card-border bg-admin-card px-2 font-admin-mono text-xs text-admin-text"
                type="url"
                placeholder={t("cover-image-placeholder")}
                value={form.coverImage}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    coverImage: event.target.value,
                  }))
                }
              />
            </label>
          </section>
        </aside>
      </div>
    </div>
  );
}
