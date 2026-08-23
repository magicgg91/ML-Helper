import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { CalculatorVisibilityList } from "@/components/calculator-visibility-list";
import { adminToolEditHref, referenceToolSlugs } from "@/lib/admin-tools";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export default async function ToolsAdminPage() {
  const session = await requireCapability("calculators.read");
  const [t, messages] = await Promise.all([
    getTranslations("admin.tools"),
    getTranslations(),
  ]);
  const tools = await prisma.calculator.findMany({
    where: { slug: { notIn: [...referenceToolSlugs] } },
    orderBy: { slug: "asc" },
  });
  return (
    <main className="admin-main">
      <p className="eyebrow">{t("eyebrow")}</p>
      <CalculatorVisibilityList
        canEdit={can(session.user.role, "calculators.write")}
        canToggle={can(session.user.role, "calculators.toggle")}
        rows={tools.map((tool) => ({
          id: tool.id,
          slug: tool.slug,
          label: messages(`${tool.slug}.name`),
          active: tool.active,
          editHref: adminToolEditHref(tool.id, tool.slug),
        }))}
      />
    </main>
  );
}
