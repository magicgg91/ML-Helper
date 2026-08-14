import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/login-form";
export default async function LoginPage() {
  const t = await getTranslations("Login");
  return (
    <main>
      <h1>{t("title")}</h1>
      <LoginForm />
    </main>
  );
}
