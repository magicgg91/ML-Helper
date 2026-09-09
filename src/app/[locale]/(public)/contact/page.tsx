import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { getLocale, getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const [t, contact, locale] = await Promise.all([
    getTranslations("Public"),
    getTranslations("contact"),
    getLocale(),
  ]);
  return pageMetadata({
    locale,
    path: "/contact",
    title: t("contact"),
    description: contact("lead"),
  });
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
