import { requireCapability } from "@/auth/require-session";
import { CalculatorVisibilityList } from "@/components/calculator-visibility-list";
import { CalculatorTranslationsEditor } from "@/components/calculator-translations-editor";
import { calculatorCatalog } from "@/lib/calculator-catalog";
import { prisma } from "@/lib/prisma";
import { translationRecord } from "@/lib/translations";

export default async function CalculatorsAdminPage() {
  await requireCapability("calculators.read");
  const calculators = await prisma.calculator.findMany({
    orderBy: { slug: "asc" },
  });
  return (
    <main className="admin-main">
      <p className="eyebrow">Contenu fonctionnel</p>
      <h1>Calculateurs</h1>
      <p className="lead">
        Un calculateur inactif reste annoncé au public, mais il est grisé et
        impossible à ouvrir.
      </p>
      <p>
        <Link href="/admin/calculators/ranking">
          Éditer les seuils du classement
        </Link>
      </p>
      <CalculatorVisibilityList
        rows={calculators.map((calculator) => ({
          id: calculator.id,
          slug: calculator.slug,
          label:
            calculatorCatalog.find(({ slug }) => slug === calculator.slug)
              ?.label ?? calculator.slug,
          active: calculator.active,
        }))}
      />
      <section
        className="translation-editor-list"
        aria-label="Traductions des calculateurs"
      >
        {calculators.map((calculator) => {
          const label =
            calculatorCatalog.find(({ slug }) => slug === calculator.slug)
              ?.label ?? calculator.slug;
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
    </main>
  );
}
import Link from "next/link";
