"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const inputClass =
  "h-9 rounded-md border border-border bg-transparent px-3 text-sm";

export function LogPurgeForm() {
  const t = useTranslations("admin.logs");
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function purge(formData: FormData) {
    const response = await fetch("/api/admin/logs", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    setMessage(response.ok ? t("purged") : t("error"));
    if (response.ok) router.refresh();
  }
  return (
    <Card>
      <CardContent className="pt-4">
        <form action={purge} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            {t("start")}
            <input
              name="start"
              type="datetime-local"
              required
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            {t("end")}
            <input
              name="end"
              type="datetime-local"
              required
              className={inputClass}
            />
          </label>
          <Button type="submit" variant="destructive">
            {t("purge")}
          </Button>
          {message && (
            <p role="status" className="text-sm text-muted-foreground">
              {message}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
