"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function SetupSuperAdminForm() {
  const router = useRouter();
  const t = useTranslations("admin.setup");
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setMessage(t("creating"));
    try {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      if (response.ok) {
        router.push("/login");
        router.refresh();
        return;
      }
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setMessage(
        payload?.error === "setup_already_completed"
          ? t("already-completed")
          : t("invalid"),
      );
    } catch {
      setMessage(t("unavailable"));
    }
  }

  return (
    <form className="setup-form" action={submit}>
      <label>
        {t("username")}
        <input
          name="username"
          minLength={3}
          maxLength={40}
          pattern="[a-zA-Z0-9_-]+"
          autoComplete="username"
          required
        />
      </label>
      <label>
        {t("password")}
        <input
          name="password"
          type="password"
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          required
        />
      </label>
      <button className="primary-button" type="submit">
        {t("submit")}
      </button>
      {message && (
        <p className="form-status" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
