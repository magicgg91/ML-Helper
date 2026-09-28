import type { Metadata } from "next";
import { Suspense } from "react";
import { CircleHelpIcon, LightbulbIcon, TriangleAlertIcon } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { Breadcrumb } from "@/components/public-breadcrumb";
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
  const [t, navigation] = await Promise.all([
    getTranslations("contact"),
    getTranslations("Navigation"),
  ]);
  // Bloc 129 §3.6 : les trois motifs, chacun avec son icône. Ils disent quoi
  // écrire avant qu'on ouvre le formulaire.
  const reasons = [
    { key: "data-error", Icon: TriangleAlertIcon },
    { key: "idea", Icon: LightbulbIcon },
    { key: "question", Icon: CircleHelpIcon },
  ] as const;
  return (
    <main className="public-main contact-page">
      <Breadcrumb
        label={navigation("breadcrumb")}
        items={[
          { label: navigation("home"), href: "/" },
          { label: t("title") },
        ]}
      />
      <div className="contact-layout">
        <div className="contact-intro">
          {/* §3.6 : « Contact », sans surtitre ni dégradé. */}
          <h1>{t("title")}</h1>
          <p className="contact-lead">{t("lead")}</p>
          <ul className="contact-reasons">
            {reasons.map(({ key, Icon }) => (
              <li key={key}>
                <Icon aria-hidden="true" size={18} />
                <div>
                  <p className="contact-reason-title">
                    {t(`reasons.${key}-title`)}
                  </p>
                  <p>{t(`reasons.${key}-text`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        {/* Le formulaire lit les paramètres d'URL (§2.4), donc il suspend :
            Next exige la frontière autour de useSearchParams. */}
        <Suspense>
          <ContactForm />
        </Suspense>
      </div>
    </main>
  );
}
