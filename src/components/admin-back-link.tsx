import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function AdminBackLink({ href }: { href: string }) {
  const t = await getTranslations("admin.common");
  // Bloc 35/10.3: matches EditorActionBar's back link exactly, so a
  // multi-table admin page (no single save action to unify) still looks
  // consistent with every other admin editor.
  return (
    <Link className="editor-back-action admin-back-link" href={href}>
      ← {t("back")}
    </Link>
  );
}
