import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { hiddenPublicLocales } from "@/lib/locale-settings";
import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { GuideEditor } from "@/components/admin-guide-editor";
import { prisma } from "@/lib/prisma";
import {
  launchLocales,
  launchRecord,
  translationRecord,
  type LaunchLocale,
} from "@/lib/translations";
import { parseGuideCategories } from "@/lib/guide-categories";

export default async function EditGuidePage({
  params,
  searchParams,
}: PageProps<"/admin/guides/[id]">) {
  const session = await requireCapability("guides.write");
  const [t, languages, locale, hiddenLocales] = await Promise.all([
    getTranslations("admin.guides"),
    // Named where the Configuration screen names them (Bloc 119): one list of
    // language names for the whole admin.
    getTranslations("admin.config.languages"),
    getLocale(),
    hiddenPublicLocales(),
  ]);
  const [{ id }, { lang }] = await Promise.all([params, searchParams]);
  // The guides list links a translation as `?lang=de`, and that still wins.
  //
  // Bloc 126/D: everything else opens on the language the admin is reading in
  // — it used to be French whatever that was, so "Modifier" put an English
  // admin in front of the French text. `locale` is already clamped to EN/FR
  // on /admin by src/proxy.ts, and it is a LaunchLocale either way.
  const initialLocale = launchLocales.includes(lang as LaunchLocale)
    ? (lang as LaunchLocale)
    : (locale as LaunchLocale);
  const guide = await prisma.guide.findUnique({ where: { id } });
  if (!guide) notFound();
  const title = translationRecord(guide.title),
    excerpt = translationRecord(guide.excerpt),
    content = translationRecord(guide.content);
  return (
    <GuideEditor
      hiddenLocales={hiddenLocales}
      canPublish={can(session.user.role, "guides.publish")}
      backHref="/admin/guides"
      backLabel={t("title")}
      languageNames={Object.fromEntries(
        launchLocales.map((code) => [
          code,
          languages.has(code) ? languages(code) : code.toUpperCase(),
        ]),
      )}
      author={guide.author}
      createdAt={guide.createdAt.toISOString()}
      updatedAt={guide.updatedAt.toISOString()}
      publicHref={`/${locale}/guides/${guide.slug}`}
      initialLocale={initialLocale}
      initial={{
        id: guide.id,
        slug: guide.slug,
        category: parseGuideCategories(guide.category),
        coverImage: guide.coverImage ?? "",
        status: guide.status,
        translations: launchRecord((code) => ({
          title: title[code] ?? "",
          excerpt: excerpt[code] ?? "",
          content: content[code] ?? "",
        })),
      }}
    />
  );
}
