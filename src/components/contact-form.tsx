"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { contactSubjects } from "@/lib/contact";

export function ContactForm() {
  const t = useTranslations("contact");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorKey, setErrorKey] = useState<"invalid" | "not-configured">(
    "invalid",
  );
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setStatus("idle");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          subject: formData.get("subject"),
          message: formData.get("message"),
        }),
      });
      if (response.ok) {
        setStatus("success");
        (document.getElementById("contact-form") as HTMLFormElement)?.reset();
      } else {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setErrorKey(
          body?.error === "not_configured" ? "not-configured" : "invalid",
        );
        setStatus("error");
      }
    } catch {
      setErrorKey("invalid");
      setStatus("error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form id="contact-form" className="contact-form" action={submit}>
      <label>
        {t("email")}
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        {t("subject")}
        <select name="subject" required defaultValue="">
          <option value="" disabled>
            {t("choose-subject")}
          </option>
          {contactSubjects.map((subject) => (
            <option key={subject} value={subject}>
              {t(`subjects.${subject}`)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("message")}
        <textarea name="message" required rows={6} />
      </label>
      <button
        type="submit"
        className="editor-action editor-action-primary"
        disabled={pending}
      >
        {t("submit")}
      </button>
      {status === "success" && <p role="status">{t("success")}</p>}
      {status === "error" && (
        <p role="alert">
          {errorKey === "not-configured"
            ? t("error-not-configured")
            : t("error-invalid")}
        </p>
      )}
    </form>
  );
}
