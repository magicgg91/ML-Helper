"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { contactSubjects, type ContactSubject } from "@/lib/contact";
import { contactPrefillKeys } from "@/lib/contact-link";

const isSubject = (value: string | null): value is ContactSubject =>
  value !== null && (contactSubjects as readonly string[]).includes(value);

export function ContactForm() {
  const t = useTranslations("contact");
  const params = useSearchParams();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorKey, setErrorKey] = useState<"invalid" | "not-configured">(
    "invalid",
  );
  const [pending, setPending] = useState(false);
  // Bloc 129 §2.4 : « Signaler une erreur » arrive ici avec l'objet déjà
  // choisi et la page déjà nommée. Les deux restent modifiables — c'est un
  // préremplissage, pas un verrou.
  const prefilled = params.get(contactPrefillKeys.subject);
  const [subject, setSubject] = useState<ContactSubject | undefined>(
    isSubject(prefilled) ? prefilled : undefined,
  );
  const page = params.get(contactPrefillKeys.page) ?? "";
  const emailId = useId();
  const pageId = useId();
  const messageId = useId();

  async function submit(formData: FormData) {
    setPending(true);
    setStatus("idle");
    try {
      const concerned = String(formData.get("page") ?? "").trim();
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          subject,
          // La page concernée voyage en tête du message : l'API n'a pas de
          // champ pour elle, et le §3.6 demande de ne pas la modifier sans
          // nécessité. C'est de toute façon là que ça se lit le mieux.
          message: concerned
            ? `${t("page-field")} : ${concerned}\n\n${formData.get("message")}`
            : formData.get("message"),
        }),
      });
      if (response.ok) {
        setStatus("success");
        (document.getElementById("contact-form") as HTMLFormElement)?.reset();
        setSubject(undefined);
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
      {/* §3.6 : l'objet en pastilles à sélection unique. Des boutons plutôt
          qu'un <select> : les quatre choix sont visibles d'un coup, et
          `aria-pressed` dit lequel est retenu. Le <fieldset> et sa <legend>
          donnent au groupe le nom que portait l'étiquette du select. */}
      <fieldset className="contact-subjects">
        <legend>{t("subject")}</legend>
        <div className="contact-subject-pills">
          {contactSubjects.map((option) => (
            <button
              key={option}
              type="button"
              className="contact-subject-pill"
              aria-pressed={subject === option}
              onClick={() => setSubject(option)}
            >
              {t(`subjects.${option}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="contact-row">
        <label htmlFor={emailId}>
          {t("email")}
          <input
            id={emailId}
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </label>
        <label htmlFor={pageId}>
          {t("page-field")}
          <input
            id={pageId}
            name="page"
            type="text"
            defaultValue={page}
            placeholder={t("page-placeholder")}
          />
        </label>
      </div>
      <label htmlFor={messageId}>
        {t("message")}
        <textarea
          id={messageId}
          name="message"
          required
          rows={7}
          // §3.6 : le placeholder suit l'objet — il demande ce qu'on a
          // besoin de lire pour cet objet-là.
          placeholder={t(`placeholders.${subject ?? "other"}`)}
        />
      </label>
      <p className="contact-privacy">{t("privacy")}</p>
      <button
        type="submit"
        className="button-primary"
        disabled={pending || subject === undefined}
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
