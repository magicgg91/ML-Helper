import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { getLocale, getTranslations } from "next-intl/server";
import { canonicalUrl, languageAlternates } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const [t, contact] = await Promise.all([
    getTranslations("Public"),
    getTranslations("contact"),
  ]);
  return {
    title: t("contact"),
    description: contact("lead"),
    alternates: {
      canonical: canonicalUrl(await getLocale(), "/contact"),
      languages: languageAlternates("/contact"),
    },
  };
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
