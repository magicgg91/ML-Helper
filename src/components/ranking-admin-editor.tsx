"use client";

import { useState } from "react";
import type { RankingConfig } from "../lib/ranking";

export function RankingAdminEditor({
  initialConfig,
}: {
  initialConfig: RankingConfig;
}) {
  const [value, setValue] = useState(JSON.stringify(initialConfig, null, 2));
  const [message, setMessage] = useState("");
  async function save() {
    try {
      const response = await fetch("/api/admin/ranking", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(JSON.parse(value)),
      });
      setMessage(
        response.ok ? "Configuration enregistrée" : "Configuration invalide",
      );
    } catch {
      setMessage("JSON invalide");
    }
  }
  return (
    <div className="ranking-admin-editor">
      <p>
        Édite les seuils, ligues cibles et récompenses. Bronze et Or sont
        volontairement vides ; Platine contient des placeholders.
      </p>
      <textarea
        aria-label="Configuration Ranking"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        spellCheck={false}
      />
      <button type="button" onClick={save}>
        Enregistrer
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
