import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/login-form";
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
