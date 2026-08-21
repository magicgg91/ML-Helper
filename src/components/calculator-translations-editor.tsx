"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("admin.tools");
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
    const response = await fetch(`/api/admin/tools/${id}/translations`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setMessage(
      response.ok
        ? t("translations-saved")
        : t("translations-error"),
    );
  }
  return (
    <details className="translation-editor">
      <summary>{t("translations-summary", { tool: label })}</summary>
      {(["fr", "en"] as const).map((locale) => (
        <fieldset key={locale}>
          <legend>{locale.toUpperCase()}</legend>
          <label>
            {t("name")}
            <input
              value={values.name[locale] ?? ""}
              onChange={(event) => update("name", locale, event.target.value)}
            />
          </label>
          <label>
            {t("description-field")}
            <textarea
              value={values.description[locale] ?? ""}
              onChange={(event) =>
                update("description", locale, event.target.value)
              }
            />
          </label>
          <label>
            {t("tip")}
            <textarea
              value={values.tips[locale] ?? ""}
              onChange={(event) => update("tips", locale, event.target.value)}
            />
          </label>
        </fieldset>
      ))}
      <button type="button" onClick={save}>
        {t("save-translations")}
      </button>
      {message && <p role="status">{message}</p>}
    </details>
  );
}
