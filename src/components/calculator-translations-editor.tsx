"use client";

import { useState } from "react";

type Values = {
  name: Record<string, string>;
  description: Record<string, string>;
  tips: Record<string, string>;
};

export function CalculatorTranslationsEditor({
  id,
  label,
  initial,
}: {
  id: string;
  label: string;
  initial: Values;
}) {
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState("");
  function update(field: keyof Values, locale: "fr" | "en", value: string) {
    setValues((current) => ({
      ...current,
      [field]: { ...current[field], [locale]: value },
    }));
  }
  async function save() {
    const payload = Object.fromEntries(
      (["name", "description", "tips"] as const).map((field) => [
        field,
        { fr: values[field].fr ?? "", en: values[field].en ?? "" },
      ]),
    );
    const response = await fetch(`/api/admin/calculators/${id}/translations`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setMessage(
      response.ok
        ? "Traductions enregistrées."
        : "Impossible d’enregistrer les traductions.",
    );
  }
  return (
    <details className="translation-editor">
      <summary>Textes multilingues — {label}</summary>
      {(["fr", "en"] as const).map((locale) => (
        <fieldset key={locale}>
          <legend>{locale.toUpperCase()}</legend>
          <label>
            Nom
            <input
              value={values.name[locale] ?? ""}
              onChange={(event) => update("name", locale, event.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              value={values.description[locale] ?? ""}
              onChange={(event) =>
                update("description", locale, event.target.value)
              }
            />
          </label>
          <label>
            Astuce
            <textarea
              value={values.tips[locale] ?? ""}
              onChange={(event) => update("tips", locale, event.target.value)}
            />
          </label>
        </fieldset>
      ))}
      <button type="button" onClick={save}>
        Enregistrer les traductions
      </button>
      {message && <p role="status">{message}</p>}
    </details>
  );
}
