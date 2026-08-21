"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { roles } from "@/auth/roles";
type UserRow = { id: string; username: string; role: string };
export function UsersManager({
  users,
  canManage = true,
}: {
  users: UserRow[];
  canManage?: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>(
    {},
  );
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  async function failure(response: Response) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    return payload?.error
      ? `${t("Users.error")} : ${payload.error}`
      : `${t("Users.error")} (HTTP ${response.status})`;
  }
  async function create(formData: FormData) {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      setMessage(response.ok ? t("Users.created") : await failure(response));
      if (response.ok) router.refresh();
    } catch {
      setMessage(`${t("Users.error")} : serveur indisponible`);
    }
  }
  async function remove(id: string) {
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "DELETE",
    });
    setMessage(response.ok ? "" : t("Users.error"));
    if (response.ok) router.refresh();
  }
  async function update(user: UserRow) {
    const password = passwords[user.id];
    if (password && password.length < 12) {
      setMessage(
        "Le nouveau mot de passe doit contenir au moins 12 caractères.",
      );
      return;
    }
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        role: selectedRoles[user.id] ?? user.role,
        ...(password ? { password } : {}),
      }),
    });
    setMessage(
      response.ok ? "Utilisateur enregistré" : await failure(response),
    );
    if (response.ok) router.refresh();
  }
  return (
    <>
      {canManage && (
        <form action={create}>
          <label>
            {t("Users.username")}
            <input name="username" required />
          </label>
          <label>
            {t("Users.password")}
            <input name="password" type="password" minLength={12} required />
          </label>
          <label>
            {t("Users.role")}
            <select name="role">
              {roles.map((role) => (
                <option key={role} value={role}>
                  {t(`Roles.${role}`)}
                </option>
              ))}
            </select>
          </label>
          <button>{t("Users.create")}</button>
        </form>
      )}
      {message && (
        <p
          className={
            message.includes("créé") || message.includes("enregistré")
              ? "form-success"
              : "form-status"
          }
          role="status"
        >
          {message}
        </p>
      )}
      <table>
        <thead>
          <tr>
            <th>{t("Users.username")}</th>
            <th>{t("Users.role")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.username}</td>
              <td>
                {canManage ? (
                  <select
                    aria-label={`${t("Users.role")} ${user.username}`}
                    value={selectedRoles[user.id] ?? user.role}
                    onChange={(event) =>
                      setSelectedRoles({
                        ...selectedRoles,
                        [user.id]: event.target.value,
                      })
                    }
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {t(`Roles.${role}`)}
                      </option>
                    ))}
                  </select>
                ) : (
                  t(`Roles.${user.role}`)
                )}
              </td>
              <td>
                {canManage && (
                  <>
                    <input
                      aria-label={`${t("Users.password")} ${user.username}`}
                      type="password"
                      minLength={12}
                      value={passwords[user.id] ?? ""}
                      onChange={(event) =>
                        setPasswords({
                          ...passwords,
                          [user.id]: event.target.value,
                        })
                      }
                    />
                    <button type="button" onClick={() => update(user)}>
                      {t("Users.save")}
                    </button>
                    <button type="button" onClick={() => remove(user.id)}>
                      {t("Users.delete")}
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
