import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { CalculatorVisibilityList } from "@/components/calculator-visibility-list";
import { CalculatorTranslationsEditor } from "@/components/calculator-translations-editor";
import { prisma } from "@/lib/prisma";
import { translationRecord } from "@/lib/translations";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function CalculatorsAdminPage() {
  const session = await requireCapability("calculators.read");
  const [t, messages] = await Promise.all([
    getTranslations("admin.tools"),
    getTranslations(),
  ]);
  const canWrite = can(session.user.role, "calculators.write");
  const calculators = await prisma.calculator.findMany({
    orderBy: { slug: "asc" },
  });
  return (
    <main className="admin-main">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{t("title")}</h1>
      <p className="lead">{t("description")}</p>
      {canWrite && (
        <p>
          <Link href="/admin/calculators/ranking">
            {t("edit-ranking")}
          </Link>
        </p>
      )}
      <CalculatorVisibilityList
        canToggle={can(session.user.role, "calculators.toggle")}
        rows={calculators.map((calculator) => ({
          id: calculator.id,
          slug: calculator.slug,
          label: messages(`${calculator.slug}.name`),
          active: calculator.active,
        }))}
      />
      {canWrite && (
        <section
          className="translation-editor-list"
          aria-label={t("translations-label")}
        >
          {calculators.map((calculator) => {
            const label = messages(`${calculator.slug}.name`);
            return (
              <CalculatorTranslationsEditor
                id={calculator.id}
                initial={{
                  name: translationRecord(calculator.name),
                  description: translationRecord(calculator.description),
                  tips: translationRecord(calculator.tips),
                }}
                key={calculator.id}
                label={label}
              />
            );
          })}
        </section>
      )}
    </main>
  );
}
