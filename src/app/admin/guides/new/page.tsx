import { getTranslations } from "next-intl/server";
import { hiddenPublicLocales } from "@/lib/locale-settings";
import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { GuideEditor } from "@/components/admin-guide-editor";
import { launchLocales, launchRecord } from "@/lib/translations";

export default async function NewGuidePage() {
  const session = await requireCapability("guides.write");
  const [t, languages, hiddenLocales] = await Promise.all([
    getTranslations("admin.guides"),
    getTranslations("admin.config.languages"),
    hiddenPublicLocales(),
  ]);
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
      initial={{
        slug: "",
        category: ["debuter"],
        coverImage: "",
        status: "draft",
        translations: launchRecord(() => ({
          title: "",
          excerpt: "",
          content: "",
        })),
      }}
    />
  );
}
