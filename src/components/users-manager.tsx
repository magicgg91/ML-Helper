"use client";
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
    if (password && password.length < 12) {
      setMessage(t("admin.users.password-too-short"));
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
    setMessage(response.ok ? t("admin.users.saved") : await failure(response));
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
          className={success ? "text-sm text-success" : "text-sm text-destructive"}
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
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.username}
                  </TableCell>
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
                  <TableCell>
                    {canManage && (
                      <div className="flex justify-end gap-2">
                        <input
                          className={inputClass}
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
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => update(user)}
                        >
                          {t("admin.users.save")}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => remove(user.id)}
                        >
                          {t("admin.users.delete")}
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
