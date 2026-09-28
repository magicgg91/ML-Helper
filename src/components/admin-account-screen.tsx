"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AdminButton } from "./admin-button";
import { ConfirmDialog } from "./admin-confirm-dialog";
import { EditorSection } from "./admin-editor-section";
import { Pill } from "./admin-pill";

/**
 * Bloc 125 §2: "Mon compte" as a screen of its own.
 *
 * It used to be a `<details>` at the bottom of the side column: opening it
 * unfolded a password form and the whole two-factor enrolment — QR code
 * included — downwards inside a 248 px column, over the navigation. The
 * actions are unchanged, down to the request bodies; only where they live is.
 *
 * Nothing here talks to the database: the same three endpoints as before
 * (`/api/admin/profile/password`, `.../totp/setup`, `.../totp`) carry the
 * session, the CSRF protection and the role checks they already carried.
 */

type TotpEnrollment = { secret: string; qrCodeDataUrl: string };

/** One labelled password box — the shape all four of them share. */
function PasswordInput({
  name,
  label,
  minLength,
}: {
  name: string;
  label: string;
  minLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-admin-dim">
      {label}
      <input
        className="admin-control admin-focus h-[var(--admin-control-h)] max-w-sm rounded-admin-control border border-admin-card-border bg-admin-card px-3 text-sm text-admin-text"
        name={name}
        type="password"
        minLength={minLength}
        autoComplete={minLength ? "new-password" : "current-password"}
        required
      />
    </label>
  );
}

function CodeInput({ label }: { label: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-admin-dim">
      {label}
      <input
        className="admin-control admin-focus h-[var(--admin-control-h)] max-w-[10rem] rounded-admin-control border border-admin-card-border bg-admin-card px-3 font-admin-mono text-sm text-admin-text"
        name="token"
        inputMode="numeric"
        pattern="[0-9]{6}"
        autoComplete="one-time-code"
        required
      />
    </label>
  );
}

export function AdminAccountScreen({
  totpEnabled: initialTotpEnabled,
}: {
  totpEnabled: boolean;
}) {
  const t = useTranslations("admin.account");
  const [message, setMessage] = useState("");
  const [totpEnabled, setTotpEnabled] = useState(initialTotpEnabled);
  const [enrollment, setEnrollment] = useState<TotpEnrollment>();
  // The disabling form is filled in first and submitted from the dialog: what
  // is confirmed is the password and code already typed, not a blank intent.
  const [disabling, setDisabling] = useState<FormData>();

  async function changePassword(formData: FormData) {
    // The confirmation box is compared here and nowhere else: the endpoint
    // takes the new password once, and it is not this bloc's business to
    // change what it accepts. A mismatch never reaches the network.
    if (formData.get("newPassword") !== formData.get("confirmPassword"))
      return setMessage(t("password-mismatch"));
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
    <div className="flex max-w-3xl flex-col gap-6">
      <EditorSection
        title={t("change-password")}
        description={t("password-hint")}
      >
        <form
          className="flex flex-col gap-4"
          action={changePassword}
          // A fresh form after a successful change, so the old password is
          // not left sitting in the box.
          key={message === t("saved") ? "saved" : "editing"}
        >
          <PasswordInput name="currentPassword" label={t("current-password")} />
          <PasswordInput
            name="newPassword"
            label={t("new-password")}
            minLength={12}
          />
          <PasswordInput
            name="confirmPassword"
            label={t("confirm-password")}
            minLength={12}
          />
          <div>
            <AdminButton type="submit" variant="primary">
              {t("save")}
            </AdminButton>
          </div>
        </form>
      </EditorSection>

      <EditorSection
        title={t("totp.title")}
        actions={
          <Pill tone={totpEnabled ? "ok" : "neutral"}>
            {t(totpEnabled ? "totp.status-on" : "totp.status-off")}
          </Pill>
        }
      >
        {totpEnabled ? (
          <form
            className="flex flex-col gap-4"
            action={(formData) => setDisabling(formData)}
          >
            <p className="text-sm text-admin-dim">{t("totp.active")}</p>
            <PasswordInput
              name="currentPassword"
              label={t("totp.your-password")}
            />
            <CodeInput label={t("totp.code")} />
            <div>
              <AdminButton type="submit" variant="danger">
                {t("totp.disable")}
              </AdminButton>
            </div>
          </form>
        ) : enrollment ? (
          <form className="flex flex-col gap-4" action={enableTotp}>
            <p className="text-sm text-admin-dim">{t("totp.scan")}</p>
            {/* Generated server-side from the authenticated user's secret. */}
            <Image
              className="rounded-admin-card border border-admin-card-border bg-white p-2"
              src={enrollment.qrCodeDataUrl}
              alt={t("totp.qr-alt")}
              width={200}
              height={200}
              unoptimized
            />
            <div className="flex flex-col gap-1">
              <span className="admin-eyebrow text-admin-dim">
                {t("totp.manual-key")}
              </span>
              <code className="w-fit rounded-admin-control bg-admin-head px-2 py-1 font-admin-mono text-sm text-admin-text">
                {enrollment.secret}
              </code>
            </div>
            <CodeInput label={t("totp.code")} />
            <div>
              <AdminButton type="submit" variant="primary">
                {t("totp.confirm")}
              </AdminButton>
            </div>
          </form>
        ) : (
          <div>
            <AdminButton type="button" variant="primary" onClick={startTotp}>
              {t("totp.activate")}
            </AdminButton>
          </div>
        )}
      </EditorSection>

      {message && (
        <p role="status" className="text-sm text-admin-text">
          {message}
        </p>
      )}

      <ConfirmDialog
        open={disabling !== undefined}
        title={t("totp.disable")}
        description={t("totp.disable-confirm")}
        confirmLabel={t("totp.disable")}
        onCancel={() => setDisabling(undefined)}
        onConfirm={() => {
          const formData = disabling;
          setDisabling(undefined);
          if (formData) void disableTotp(formData);
        }}
      />
    </div>
  );
}
