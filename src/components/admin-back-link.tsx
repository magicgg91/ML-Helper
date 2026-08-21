import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function AdminBackLink({ href }: { href: string }) {
  const t = await getTranslations("admin.common");
  return <Link className="secondary-action admin-back-link" href={href}>← {t("back")}</Link>;
}

