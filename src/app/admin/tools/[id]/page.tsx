import { notFound } from "next/navigation";
import { requireCapability } from "@/auth/require-session";
import { AdminBackLink } from "@/components/admin-back-link";
import { CalculatorTranslationsEditor } from "@/components/calculator-translations-editor";
import {
  CityParametersEditor,
  TemplarParametersEditor,
} from "@/components/named-parameters-editor";
import { RankingAdminEditor } from "@/components/ranking-admin-editor";
import {
  getCityParameters,
  getTemplarParameters,
} from "@/lib/admin-formulas-server";
import { prisma } from "@/lib/prisma";
import { getRankingConfig } from "@/lib/ranking";
import { translationRecord } from "@/lib/translations";
import { getTranslations } from "next-intl/server";

export default async function EditToolPage({
  params,
}: PageProps<"/admin/tools/[id]">) {
  await requireCapability("calculators.write");
  const { id } = await params;
  const t = await getTranslations("admin.tools");
  let content: React.ReactNode;
  let title: string;
  if (id === "city-parameters") {
    title = t("city-parameters");
    content = <CityParametersEditor initial={await getCityParameters()} />;
  } else if (id === "ranking") {
    title = t("ranking-editor");
    content = <RankingAdminEditor initialConfig={await getRankingConfig()} />;
  } else if (id === "templars") {
    title = t("templar-parameters");
    content = (
      <TemplarParametersEditor initial={await getTemplarParameters()} />
    );
  } else {
    const tool = await prisma.calculator.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (
      !tool ||
      ["combat-equipment", "expedition-equipment", "level-up"].includes(
        tool.slug,
      )
    )
      notFound();
    title = t("edit-tool", { tool: tool.slug });
    content = (
      <CalculatorTranslationsEditor
        id={tool.id}
        label={tool.slug}
        initial={{
          description: translationRecord(tool.description),
          tips: translationRecord(tool.tips),
        }}
      />
    );
  }
  return (
    <main className="admin-main">
      <AdminBackLink href="/admin/tools" />
      <h1>{title}</h1>
      {content}
    </main>
  );
}
