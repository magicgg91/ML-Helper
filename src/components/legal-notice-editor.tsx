"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GuideMarkdownEditor } from "./guide-markdown-editor";
import { EditorActionBar } from "./editor-action-bar";
import {
  EditorialLocaleSelect,
  type EditorialLocale,
} from "./editorial-locale-select";

export function LegalNoticeEditor({
  initialContent,
}: {
  initialContent: Record<EditorialLocale, string>;
}) {
  const t = useTranslations("admin.content");
  const [locale, setLocale] = useState<EditorialLocale>("fr");
  const [content, setContent] = useState(initialContent);
  const [message, setMessage] = useState("");

  async function save() {
    setMessage(t("saving"));
    const response = await fetch("/api/admin/content/legal-notice", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    }).catch(() => null);
    setMessage(response?.ok ? t("saved") : t("error"));
  }

  return (
    <div className="legal-notice-editor">
      <EditorActionBar backHref="/admin" message={message}>
        <button
          className="editor-action editor-action-primary"
          type="button"
          onClick={save}
        >
          {t("save")}
        </button>
      </EditorActionBar>
      <EditorialLocaleSelect
        label={t("language-label")}
        value={locale}
        onChange={setLocale}
      />
      <section className="admin-panel guide-simple-fields">
        <GuideMarkdownEditor
          label={t("field")}
          value={content[locale]}
          onChange={(value) =>
            setContent((current) => ({ ...current, [locale]: value }))
          }
        />
      </section>
    </div>
  );
}
