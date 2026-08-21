"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function LegalNoticeEditor({
  initialContent,
}: {
  initialContent: string;
}) {
  const t = useTranslations("admin.content");
  const [content, setContent] = useState(initialContent);
  const [message, setMessage] = useState("");

  async function save() {
    setMessage(t("saving"));
    const response = await fetch("/api/admin/content/legal-notice", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    }).catch(() => null);
    setMessage(
      response?.ok
        ? t("saved")
        : t("error"),
    );
  }

  return (
    <section className="admin-panel guide-simple-fields">
      <label>
        {t("field")}
        <textarea
          className="guide-markdown-input"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          spellCheck
        />
      </label>
      <button className="primary-button" type="button" onClick={save}>
        {t("save")}
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
