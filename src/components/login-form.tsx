"use client";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function LoginForm() {
  const t = useTranslations("Login");
  const router = useRouter();
  const [error, setError] = useState(false);
  async function submit(formData: FormData) {
    setError(false);
    const result = await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirect: false,
    });
    if (result?.ok) {
      router.push("/admin");
    } else setError(true);
  }
  return (
    <form action={submit}>
      <label>
        {t("username")}
        <input name="username" required autoComplete="username" />
      </label>
      <label>
        {t("password")}
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </label>
      <button type="submit">{t("submit")}</button>
      {error && <p role="alert">{t("error")}</p>}
    </form>
  );
}
