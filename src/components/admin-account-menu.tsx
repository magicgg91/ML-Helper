"use client";

import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import Image from "next/image";

type TotpEnrollment = { secret: string; qrCodeDataUrl: string };

export function AdminAccountMenu({
  username,
  totpEnabled: initialTotpEnabled,
}: {
  username: string;
  totpEnabled: boolean;
}) {
  const t = useTranslations("admin.account");
  const [message, setMessage] = useState("");
  const [totpEnabled, setTotpEnabled] = useState(initialTotpEnabled);
  const [enrollment, setEnrollment] = useState<TotpEnrollment>();

  async function changePassword(formData: FormData) {
    const response = await fetch("/api/admin/profile/password", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
      }),
    });
    setMessage(response.ok ? t("saved") : t("invalid"));
  }

  async function startTotp() {
    setMessage("");
    const response = await fetch("/api/admin/profile/totp/setup", {
      method: "POST",
    }).catch(() => null);
    if (!response?.ok) return setMessage(t("totp.setup-error"));
    setEnrollment((await response.json()) as TotpEnrollment);
  }

  async function enableTotp(formData: FormData) {
    const response = await fetch("/api/admin/profile/totp", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: formData.get("token") }),
    }).catch(() => null);
    if (!response?.ok) return setMessage(t("totp.invalid"));
    setTotpEnabled(true);
    setEnrollment(undefined);
    setMessage(t("totp.enabled"));
  }

  async function disableTotp(formData: FormData) {
    const response = await fetch("/api/admin/profile/totp", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        currentPassword: formData.get("currentPassword"),
        token: formData.get("token"),
      }),
    }).catch(() => null);
    if (!response?.ok) return setMessage(t("totp.disable-error"));
    setTotpEnabled(false);
    setMessage(t("totp.disabled"));
  }

  return (
    <div className="admin-account">
      <details>
        <summary>{username}</summary>
        <div className="admin-account-menu">
          <form action={changePassword}>
            <strong>{t("change-password")}</strong>
            <label>
              {t("current-password")}
              <input name="currentPassword" type="password" required />
            </label>
            <label>
              {t("new-password")}
              <input
                name="newPassword"
                type="password"
                minLength={12}
                required
              />
            </label>
            <button type="submit">{t("save")}</button>
          </form>

          <section className="totp-settings">
            <strong>{t("totp.title")}</strong>
            {totpEnabled ? (
              <form action={disableTotp}>
                <p>{t("totp.active")}</p>
                <label>
                  {t("current-password")}
                  <input name="currentPassword" type="password" required />
                </label>
                <label>
                  {t("totp.code")}
                  <input
                    name="token"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    required
                  />
                </label>
                <button className="danger-action" type="submit">
                  {t("totp.disable")}
                </button>
              </form>
            ) : enrollment ? (
              <form action={enableTotp}>
                <p>{t("totp.scan")}</p>
                {/* Generated server-side from the authenticated user's secret. */}
                <Image
                  className="totp-qr"
                  src={enrollment.qrCodeDataUrl}
                  alt={t("totp.qr-alt")}
                  width={240}
                  height={240}
                  unoptimized
                />
                <p>{t("totp.manual-key")}</p>
                <code className="totp-secret">{enrollment.secret}</code>
                <label>
                  {t("totp.code")}
                  <input
                    name="token"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    required
                  />
                </label>
                <button type="submit">{t("totp.confirm")}</button>
              </form>
            ) : (
              <button type="button" onClick={startTotp}>
                {t("totp.activate")}
              </button>
            )}
          </section>

          {message && <p role="status">{message}</p>}
          <button
            className="secondary-action"
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            {t("logout")}
          </button>
        </div>
      </details>
    </div>
  );
}
