import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { GuideEditor } from "@/components/admin-guide-editor";
import { prisma } from "@/lib/prisma";
import {
  launchLocales,
  launchRecord,
  translationRecord,
} from "@/lib/translations";
import { parseGuideCategories } from "@/lib/guide-categories";

export default async function EditGuidePage({
  params,
}: PageProps<"/admin/guides/[id]">) {
  const session = await requireCapability("guides.write");
  const [t, languages, locale] = await Promise.all([
    getTranslations("admin.guides"),
    // Named where the Configuration screen names them (Bloc 119): one list of
    // language names for the whole admin.
    getTranslations("admin.config.languages"),
    getLocale(),
  ]);
  const { id } = await params;
  const guide = await prisma.guide.findUnique({ where: { id } });
  if (!guide) notFound();
  const title = translationRecord(guide.title),
    excerpt = translationRecord(guide.excerpt),
    content = translationRecord(guide.content);
  return (
    <GuideEditor
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
