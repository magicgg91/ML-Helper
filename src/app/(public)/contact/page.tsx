import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Public");
  return { title: t("contact") };
}

export default async function ContactPage() {
  const t = await getTranslations("contact");
  return (
    <main className="public-main contact-page">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{t("title")}</h1>
      <p className="lead">{t("lead")}</p>
      <ContactForm />
    </main>
  );
}
