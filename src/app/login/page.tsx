import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/login-form";

// Bloc 42/J: an admin login page has no organic-search value.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function LoginPage() {
  const t = await getTranslations("login");
  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <p className="eyebrow">ML-Helper</p>
        <h1 id="login-title">{t("title")}</h1>
        <LoginForm />
      </section>
    </main>
  );
}
