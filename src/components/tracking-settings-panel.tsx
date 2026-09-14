"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

// Bloc 100/A: the visit-tracking script URL. Deliberately generic — the field
// takes any script URL, and nothing in the site knows which analytics tool is
// behind it. Leaving it empty is how tracking is turned off: nothing is
// injected by default.
//
// Bloc 101: plus the identifier the tag carries next to its src
// (data-website-id for Umami). Optional on purpose — some trackers need none.
export function TrackingSettingsPanel({
  url,
  websiteId,
}: {
  url: string;
  websiteId: string;
}) {
  const t = useTranslations("admin.config.tracking");
  const [value, setValue] = useState(url);
  const [id, setId] = useState(websiteId);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMessage(t("saving"));
    try {
      const response = await fetch("/api/admin/config/tracking", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: value, websiteId: id }),
      });
      if (!response.ok) {
        // The route refuses anything that is not a usable http(s) URL, or an
        // identifier that is not one, so a typo is named as such instead of
        // being reported as a server error.
        if (response.status === 400) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          setMessage(
            body?.error === "invalid_website_id"
              ? t("invalid-website-id")
              : t("invalid-url"),
          );
          return;
        }
        setMessage(t("save-error", { status: response.status }));
        return;
      }
      const saved = (await response.json()) as {
        url: string;
        websiteId: string;
      };
      setValue(saved.url);
      setId(saved.websiteId);
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
      <input
        id="tracking-url"
        name="tracking-url"
        type="url"
        inputMode="url"
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder={t("placeholder")}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <p className="mt-2 text-sm text-muted-foreground">{t("hint")}</p>

      <label
        className="mt-4 block text-sm font-medium"
        htmlFor="tracking-website-id"
      >
        {t("website-id-label")}
      </label>
      <input
        id="tracking-website-id"
        name="tracking-website-id"
        type="text"
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder={t("website-id-placeholder")}
        value={id}
        onChange={(event) => setId(event.target.value)}
      />
      <p className="mt-2 text-sm text-muted-foreground">
        {t("website-id-hint")}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <Button onClick={save} disabled={saving}>
          {t("save")}
        </Button>
      </div>
      {message && (
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
