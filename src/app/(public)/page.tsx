import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hasSuperAdmin } from "../../services/setup-superadmin";
import { getTranslations } from "next-intl/server";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { ToolCategoryGrid } from "@/components/tool-category-grid";
import Image from "next/image";

export const metadata: Metadata = { title: "ML Helper" };

const slides = [
  ["/visual-kingdom.svg", "carouselKingdom"],
  ["/visual-battle.svg", "carouselBattle"],
  ["/visual-map.svg", "carouselMap"],
] as const;

export default async function HomePage() {
  await connection();
  if (!(await hasSuperAdmin())) redirect("/admin/setup");
  const [t, tools, active] = await Promise.all([
    getTranslations("Home"),
    getTranslations("tools"),
    getCalculatorAvailability(),
  ]);
  return (
    <main className="public-main">
      <section className="home-carousel" aria-label={t("carouselLabel")}>
        <div className="home-carousel-track">
          {slides.map(([src, alt]) => (
            <figure key={src}>
              <Image
                src={src}
                alt={t(alt)}
                fill
                priority={src === slides[0][0]}
                sizes="100vw"
              />
            </figure>
          ))}
        </div>
        <div className="home-carousel-copy">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p>{t("description")}</p>
        </div>
      </section>
      {/* Bloc 33/A: direct 1-click access to a tool's category, instead of
          a marketing teaser linking through to /tools — same layout as
          /tools itself (ToolCategoryGrid), which stays reachable via the
          main nav unchanged. */}
      <section className="home-tools">
        <p className="eyebrow">{t("toolsEyebrow")}</p>
        <h2>{t("toolsTitle")}</h2>
        <p>{t("toolsDescription")}</p>
        <ToolCategoryGrid active={active} t={tools} />
      </section>
      {/* A small Guides/Référentiels teaser below the tools, not a full
          replacement for /guides (still reachable via the main nav). */}
      <section className="home-feature home-feature-reverse home-guides-teaser">
        <div className="home-feature-media">
          <Image
            src="/visual-map.svg"
            alt={t("guidesImageAlt")}
            fill
            sizes="(max-width: 760px) 100vw, 50vw"
          />
        </div>
        <div className="home-feature-copy">
          <p className="eyebrow">{t("guidesEyebrow")}</p>
          <h2>{t("guidesTitle")}</h2>
          <p>{t("guidesDescription")}</p>
          <Link className="primary-link" href="/guides">
            {t("guides")}
          </Link>
        </div>
      </section>
    </main>
  );
}
