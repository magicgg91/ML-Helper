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
  const [success, setSuccess] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>(
    {},
  );
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  async function failure(response: Response) {
    return `${t("admin.users.error")} (HTTP ${response.status})`;
  }
  async function create(formData: FormData) {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      setSuccess(response.ok);
      setMessage(response.ok ? t("admin.users.created") : await failure(response));
      if (response.ok) router.refresh();
    } catch {
      setSuccess(false);
      setMessage(`${t("admin.users.error")} : ${t("admin.users.server-error")}`);
    }
  }
  async function remove(id: string) {
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "DELETE",
    });
    setMessage(response.ok ? "" : t("admin.users.error"));
    setSuccess(response.ok);
    if (response.ok) router.refresh();
  }
  async function update(user: UserRow) {
    const password = passwords[user.id];
    if (password && password.length < 12) {
      setMessage(
        t("admin.users.password-too-short"),
      );
      setSuccess(false);
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
      response.ok ? t("admin.users.saved") : await failure(response),
    );
    setSuccess(response.ok);
    if (response.ok) router.refresh();
  }
  return (
    <>
      {canManage && (
        <form action={create}>
          <label>
            {t("admin.users.username")}
            <input name="username" required />
          </label>
          <label>
            {t("admin.users.password")}
            <input name="password" type="password" minLength={12} required />
          </label>
          <label>
            {t("admin.users.role")}
            <select name="role">
              {roles.map((role) => (
                <option key={role} value={role}>
                  {t(`roles.${role}`)}
                </option>
              ))}
            </select>
          </label>
          <button>{t("admin.users.create")}</button>
        </form>
      )}
      {message && (
        <p
          className={
            success ? "form-success" : "form-status"
          }
          role="status"
        >
          {message}
        </p>
      )}
      <table>
        <thead>
          <tr>
            <th>{t("admin.users.username")}</th>
            <th>{t("admin.users.role")}</th>
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
                    aria-label={`${t("admin.users.role")} ${user.username}`}
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
                        {t(`roles.${role}`)}
                      </option>
                    ))}
                  </select>
                ) : (
                  t(`roles.${user.role}`)
                )}
              </td>
              <td>
                {canManage && (
                  <>
                    <input
                      aria-label={`${t("admin.users.password")} ${user.username}`}
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
                      {t("admin.users.save")}
                    </button>
                    <button type="button" onClick={() => remove(user.id)}>
                      {t("admin.users.delete")}
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
