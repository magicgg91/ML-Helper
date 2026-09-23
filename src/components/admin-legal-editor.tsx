"use client";

import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import {
  markdownRehypePluginsWithPlaceholders,
  markdownRemarkPluginsWithBreaks,
} from "@/lib/markdown-plugins";
import { legalNoticePlaceholders } from "@/lib/legal-notice";
import { launchLocales, type LaunchLocale } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";
import { GuideMarkdownEditor } from "./guide-markdown-editor";
import { Pill } from "./admin-pill";
import { useSaveStatus } from "./use-save-status";

/**
 * Bloc 119: the Pages légales screen.
 *
 * There is one page for now — the legal notice — so the screen opens on it
 * rather than making somebody pick it from a list of one.
 *
 * Three things it adds to the editor it replaces: the languages are tabs
 * instead of a dropdown (and say which ones are still to write), a banner
 * counts the fields left to fill in and takes the caret to the first of
 * them, and the preview renders exactly what the public page renders —
 * single line breaks included, which neither did before.
 */

type Mode = "edit" | "live" | "preview";

export function AdminLegalEditor({
  initialContent,
  languageNames,
  publicHref,
}: {
  initialContent: Record<LaunchLocale, string>;
  languageNames: Record<string, string>;
  publicHref: string;
}) {
  const t = useTranslations("admin.content");
  const [locale, setLocale] = useState<LaunchLocale>("fr");
  const [content, setContent] = useState(initialContent);
  const [saved, setSaved] = useState(initialContent);
  const [mode, setMode] = useState<Mode>("live");
  const status = useSaveStatus();
  const textareaId = useId();

  const dirty = launchLocales.some((code) => content[code] !== saved[code]);
  const placeholders = legalNoticePlaceholders(content[locale] ?? "");

  // Bloc 119 §3: a tab closed on unsaved work loses it, and the browser is
  // the only thing that can ask about it in time.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    status.pending(t("saving"));
    const response = await fetch("/api/admin/content/legal-notice", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    }).catch(() => null);
    const ok = Boolean(response?.ok);
    if (ok) setSaved(content);
    status.settle(ok, { success: t("saved"), error: t("error") });
  }

  /** Puts the caret on the first unfinished field, in the text itself. */
  function goToFirstPlaceholder() {
    const [first] = placeholders;
    if (!first) return;
    setMode("edit");
    // After the switch to the write view, so the textarea is on screen.
    window.setTimeout(() => {
      const textarea = document.getElementById(textareaId);
      if (!(textarea instanceof HTMLTextAreaElement)) return;
      const index = textarea.value.indexOf(first);
      if (index < 0) return;
      textarea.focus();
      textarea.setSelectionRange(index, index + first.length);
      // Chromium scrolls a selection into view only when it is made by the
      // user; doing it by hand keeps the caret visible in a long notice.
      textarea.blur();
      textarea.focus();
    }, 0);
  }

  const modes: { value: Mode; label: string }[] = [
    { value: "edit", label: t("mode-write") },
    { value: "live", label: t("mode-split") },
    { value: "preview", label: t("mode-preview") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="admin-section-title">{t("title")}</h2>
          {dirty ? (
            <Pill tone="warn">{t("unsaved")}</Pill>
          ) : (
            <Pill tone="ok">{`✓ ${t("all-saved")}`}</Pill>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AdminButton asChild>
            <Link href={publicHref} target="_blank" rel="noopener noreferrer">
              {t("view-on-site")}
              <ExternalLinkIcon aria-hidden="true" />
            </Link>
          </AdminButton>
          <AdminButton type="button" variant="primary" onClick={save}>
            {t("save")}
          </AdminButton>
        </div>
      </div>

      {placeholders.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-admin-card border border-admin-card-border bg-admin-warn p-4 text-admin-warn-ink">
          <div className="min-w-0">
            <p className="font-semibold">
              {t("todo-banner", { count: placeholders.length })}
            </p>
            <ul
              aria-label={t("todo-list-label")}
              className="mt-1 flex flex-wrap gap-x-3 text-xs"
            >
              {placeholders.map((placeholder, index) => (
                <li key={`${placeholder}-${index}`}>{placeholder}</li>
              ))}
            </ul>
          </div>
          <AdminButton type="button" size="sm" onClick={goToFirstPlaceholder}>
            {t("todo-goto-first")}
          </AdminButton>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label={t("languages-label")}
          className="flex gap-1"
        >
          {launchLocales.map((code) => {
            const empty = !(content[code] ?? "").trim();
            return (
              <button
                key={code}
                type="button"
                role="tab"
                aria-selected={code === locale}
                tabIndex={code === locale ? 0 : -1}
                onClick={() => setLocale(code)}
                className={cn(
                  "admin-focus inline-flex h-[var(--admin-control-h-sm)] items-center gap-2 rounded-admin-control border px-3 text-sm",
                  code === locale
                    ? "border-admin-accent bg-admin-accent-soft text-admin-accent-soft-ink"
                    : "border-admin-card-border text-admin-dim hover:text-admin-text",
                  empty && "border-dashed",
                )}
              >
                {languageNames[code] ?? code.toUpperCase()}
                {empty && (
                  <span className="text-xs opacity-80">{t("to-create")}</span>
                )}
              </button>
            );
          })}
        </div>

        <div role="group" aria-label={t("mode-label")} className="flex gap-1">
          {modes.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={mode === item.value}
              onClick={() => setMode(item.value)}
              className={cn(
                "admin-focus inline-flex h-[var(--admin-control-h-sm)] items-center rounded-admin-control border px-3 text-sm",
                mode === item.value
                  ? "border-admin-accent bg-admin-accent-soft text-admin-accent-soft-ink"
                  : "border-admin-card-border text-admin-dim hover:text-admin-text",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <GuideMarkdownEditor
        label={t("field")}
        value={content[locale] ?? ""}
        onChange={(value) =>
          setContent((current) => ({ ...current, [locale]: value }))
        }
        mode={mode}
        textareaId={textareaId}
        remarkPlugins={markdownRemarkPluginsWithBreaks}
        rehypePlugins={markdownRehypePluginsWithPlaceholders}
      />

      {status.message && (
        <p className="text-sm text-admin-dim" role="status">
          {status.message}
        </p>
      )}
    </div>
  );
}
