import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LogFilterInput } from "@/lib/log-filters";

const inputClass =
  "h-9 rounded-md border border-border bg-transparent px-3 text-sm";

export function LogFilterForm({
  filters,
  t,
}: {
  filters: LogFilterInput;
  t: (key: string) => string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <form
          method="get"
          className="flex flex-wrap items-end gap-3"
          aria-label={t("filter-apply")}
        >
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            {t("filter-user")}
            <input
              name="user"
              defaultValue={filters.user}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            {t("filter-message")}
            <input
              name="q"
              defaultValue={filters.message}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            {t("start")}
            <input
              name="from"
              type="date"
              defaultValue={filters.from}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            {t("end")}
            <input
              name="to"
              type="date"
              defaultValue={filters.to}
              className={inputClass}
            />
          </label>
          <Button type="submit">{t("filter-apply")}</Button>
          <Button variant="ghost" asChild>
            <Link href="/admin/logs">{t("filter-reset")}</Link>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
