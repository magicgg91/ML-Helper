import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { GuideEditor } from "@/components/guide-editor";

export default async function NewGuidePage() {
  const session = await requireCapability("guides.write");
  return (
    <main className="admin-main">
      <p className="eyebrow">Guides</p>
      <h1>Nouveau guide</h1>
      <GuideEditor
        canPublish={can(session.user.role, "guides.publish")}
        initial={{
          slug: "",
          category: "debutants",
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
