import type { Metadata } from "next";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Breadcrumb } from "@/components/public-breadcrumb";
import { GuideToc } from "@/components/guide-toc";
import {
  defaultLegalNoticeContent,
  legalNoticeKey,
  splitLeadingHeading,
} from "@/lib/legal-notice";
import { guideOutline } from "@/lib/guide-outline";
import { prisma } from "@/lib/prisma";
import { localizedText } from "@/lib/translations";
import { getLocale, getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([
    getTranslations("Public"),
    getLocale(),
  ]);
  return pageMetadata({
    locale,
    path: "/legal",
    title: t("legal"),
    description: t("descriptions.legal"),
  });
}

export default async function LegalPage() {
  const [legalNotice, locale, t, navigation, guides] = await Promise.all([
    prisma.staticContent.findUnique({ where: { key: legalNoticeKey } }),
    getLocale(),
    getTranslations("Public"),
    getTranslations("Navigation"),
    getTranslations("guides"),
  ]);
  const markdown = localizedText(
    legalNotice?.content ?? defaultLegalNoticeContent,
    locale,
  );
  // Bloc 129 §3.7 : le titre du document devient le H1 de la page, avec la
  // date sous lui ; sans quoi le `#` du markdown ferait un second H1 au
  // milieu du contenu.
  const { title, body } = splitLeadingHeading(markdown);
  // Les titres ne sont pas renumérotés sur cette page (le document porte son
  // propre H1), donc le sommaire lit les H2 tels qu'ils sont écrits.
  const headings = guideOutline(body, { shift: false });
  return (
    <main className="public-main legal-page">
      <Breadcrumb
        label={navigation("breadcrumb")}
        items={[
          { label: navigation("home"), href: "/" },
          { label: t("legal") },
        ]}
      />
      <header className="legal-header">
        <h1 id="legal-top">{title ?? t("legal")}</h1>
        {/* La date vient de l'enregistrement. Tant qu'il n'y en a pas — le
            contenu par défaut, jamais enregistré — la ligne n'est pas
            affichée plutôt que de dater le texte d'aujourd'hui. */}
        {legalNotice?.updatedAt && (
          <p className="legal-updated">
            {t("legal-updated", {
              date: new Intl.DateTimeFormat(locale, {
                dateStyle: "long",
              }).format(legalNotice.updatedAt),
            })}
          </p>
        )}
      </header>
      <div className="legal-body">
        <aside className="guide-aside">
          <GuideToc
            headings={headings}
            label={guides("detail.toc")}
            introLabel={guides("detail.intro")}
            introHref="#legal-top"
          />
        </aside>
        <div className="legal-content">
          {/* Bloc 119: the notice is written one idea per line, and CommonMark
              folds a lone newline into a space — the page read as one run-on
              paragraph. The admin preview renders it with the same option, so
              what an editor sees is what a visitor gets.
              Bloc 129 §3.7 : les champs encore à compléter sont surlignés,
              comme dans l'aperçu d'administration — le surlignage s'éteint de
              lui-même quand le texte réel est saisi, puisqu'il suit le motif
              et non une liste. */}
          <MarkdownRenderer breaks highlightPlaceholders markdown={body} />
        </div>
      </div>
    </main>
  );
}
