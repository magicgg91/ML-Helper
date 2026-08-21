import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { GuideEditor } from "@/components/guide-editor";
import { getTranslations } from "next-intl/server";

export default async function NewGuidePage() {
  const session = await requireCapability("guides.write");
  const t = await getTranslations("admin.guides");
  return (
    <main className="admin-main">
      <p className="eyebrow">{t("title")}</p>
      <h1>{t("new-title")}</h1>
      <GuideEditor
        canPublish={can(session.user.role, "guides.publish")}
        initial={{
          slug: "",
          category: ["debuter"],
          coverImage: "",
          status: "draft",
          translations: {
            fr: { title: "", excerpt: "", content: "" },
            en: { title: "", excerpt: "", content: "" },
          },
        }}
      />
    </main>
  );
}
