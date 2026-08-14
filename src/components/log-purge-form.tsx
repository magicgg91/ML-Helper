"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function LogPurgeForm() {
  const t = useTranslations("Logs");
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function purge(formData: FormData) {
    const response = await fetch("/api/admin/logs", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    setMessage(response.ok ? t("purged") : t("error"));
    if (response.ok) router.refresh();
  }
  return (
    <form action={purge}>
      <label>
        {t("start")}
        <input name="start" type="datetime-local" required />
      </label>
      <label>
        {t("end")}
        <input name="end" type="datetime-local" required />
      </label>
      <button>{t("purge")}</button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
