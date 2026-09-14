"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

// Bloc 100/A: the visit-tracking script URL. Deliberately generic — the field
// takes any script URL, and nothing in the site knows which analytics tool is
// behind it. Leaving it empty is how tracking is turned off: nothing is
// injected by default.
export function TrackingSettingsPanel({ url }: { url: string }) {
  const t = useTranslations("admin.config.tracking");
  const [value, setValue] = useState(url);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMessage(t("saving"));
    try {
      const response = await fetch("/api/admin/config/tracking", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      if (!response.ok) {
        // The route refuses anything that is not a usable http(s) URL, so a
        // typo is named as such instead of being reported as a server error.
        setMessage(
          response.status === 400
            ? t("invalid-url")
            : t("save-error", { status: response.status }),
        );
        return;
      }
      const saved = (await response.json()) as { url: string };
      setValue(saved.url);
      setMessage(saved.url ? t("saved") : t("cleared"));
    } catch {
      setMessage(t("server-error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <label className="block text-sm font-medium" htmlFor="tracking-url">
        {t("label")}
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          id="tracking-url"
          name="tracking-url"
          type="url"
          inputMode="url"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder={t("placeholder")}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button onClick={save} disabled={saving}>
          {t("save")}
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{t("hint")}</p>
      {message && (
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
