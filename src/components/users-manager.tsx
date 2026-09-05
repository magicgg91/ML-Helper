"use client";
import { Power, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { roles } from "@/auth/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const inputClass =
  "h-9 rounded-md border border-border bg-transparent px-3 text-sm";

type UserRow = { id: string; username: string; role: string; active: boolean };
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
  // Bloc 92/A11y (M4): which user's inline password field currently carries the
  // "too short" error, so it's tied to that specific input rather than only the
  // shared page-level status message.
  const [pwErrorUserId, setPwErrorUserId] = useState<string | null>(null);
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
      setMessage(
        response.ok ? t("admin.users.created") : await failure(response),
      );
      if (response.ok) router.refresh();
    } catch {
      setSuccess(false);
      setMessage(
        `${t("admin.users.error")} : ${t("admin.users.server-error")}`,
      );
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
    setPwErrorUserId(null);
    if (password && password.length < 12) {
      // Bloc 92/A11y (M4): surface the error on the field itself (role="alert"
      // + aria-describedby below), not only in the shared page-level status.
      setPwErrorUserId(user.id);
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
    setMessage(response.ok ? t("admin.users.saved") : await failure(response));
    setSuccess(response.ok);
    if (response.ok) router.refresh();
  }
  async function toggleActive(user: UserRow) {
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    setMessage(
      response.ok
        ? t(user.active ? "admin.users.deactivated" : "admin.users.activated")
        : await failure(response),
    );
    setSuccess(response.ok);
    if (response.ok) router.refresh();
  }
  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.users.create")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={create} className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                {t("admin.users.username")}
                <input name="username" required className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                {t("admin.users.password")}
                <input
                  name="password"
                  type="password"
                  minLength={12}
                  required
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                {t("admin.users.role")}
                <select name="role" className={inputClass}>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {t(`roles.${role}`)}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit">{t("admin.users.create")}</Button>
            </form>
          </CardContent>
        </Card>
      )}
      {message && (
        <p
          className={
            success ? "text-sm text-success" : "text-sm text-destructive"
          }
          role="status"
        >
          {message}
        </p>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.users.username")}</TableHead>
                <TableHead>{t("admin.users.role")}</TableHead>
                <TableHead>{t("admin.users.status")}</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <select
                        className={inputClass}
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
                  </TableCell>
                  <TableCell
                    className={
                      user.active ? "text-success" : "text-muted-foreground"
                    }
                  >
                    {t(
                      user.active
                        ? "admin.users.active"
                        : "admin.users.inactive",
                    )}
                  </TableCell>
                  <TableCell>
                    {canManage && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => toggleActive(user)}
                          title={t(
                            user.active
                              ? "admin.users.deactivate"
                              : "admin.users.activate",
                          )}
                          aria-label={t(
                            user.active
                              ? "admin.users.deactivate"
                              : "admin.users.activate",
                          )}
                        >
                          <Power aria-hidden="true" />
                        </Button>
                        <input
                          className={inputClass}
                          aria-label={`${t("admin.users.password")} ${user.username}`}
                          aria-invalid={pwErrorUserId === user.id}
                          aria-describedby={
                            pwErrorUserId === user.id
                              ? `password-error-${user.id}`
                              : undefined
                          }
                          type="password"
                          minLength={12}
                          value={passwords[user.id] ?? ""}
                          onChange={(event) => {
                            setPasswords({
                              ...passwords,
                              [user.id]: event.target.value,
                            });
                            if (pwErrorUserId === user.id)
                              setPwErrorUserId(null);
                          }}
                        />
                        {pwErrorUserId === user.id && (
                          <small
                            className="field-error"
                            id={`password-error-${user.id}`}
                            role="alert"
                          >
                            {t("admin.users.password-too-short")}
                          </small>
                        )}
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => update(user)}
                          title={t("admin.users.save")}
                          aria-label={t("admin.users.save")}
                        >
                          <Save aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => remove(user.id)}
                          title={t("admin.users.delete")}
                          aria-label={t("admin.users.delete")}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
