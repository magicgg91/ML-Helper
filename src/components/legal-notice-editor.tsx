"use client";

import { useState } from "react";

export function LegalNoticeEditor({
  initialContent,
}: {
  initialContent: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [message, setMessage] = useState("");

  async function save() {
    setMessage("Enregistrement…");
    const response = await fetch("/api/admin/content/legal-notice", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    }).catch(() => null);
    setMessage(
      response?.ok
        ? "Mentions légales enregistrées."
        : "Impossible d’enregistrer les mentions légales.",
    );
  }

  return (
    <section className="admin-panel guide-simple-fields">
      <label>
        Texte des mentions légales (Markdown)
        <textarea
          className="guide-markdown-input"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          spellCheck
        />
      </label>
      <button className="primary-button" type="button" onClick={save}>
        Enregistrer
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
