"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { AdminButton } from "./admin-button";
import { SearchInput } from "./admin-filters";

/**
 * Bloc 119: the audit log's filter bar.
 *
 * It applies itself. The screen it replaces had a Filtrer button, so a filled
 * field that was never submitted showed a list that did not match what the
 * fields said. The state stays in the URL — a filtered view is a link
 * somebody can send — and the text box waits for a pause in the typing
 * before navigating, so one word is one request rather than six.
 */

/** How long the text box waits after the last keystroke. */
const searchDebounceMs = 350;

export function AdminLogsFilters({
  usernames,
  filters,
}: {
  usernames: string[];
  filters: { user?: string; message?: string; from?: string; to?: string };
}) {
  const t = useTranslations("admin.logs");
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = useId();
  const fromId = useId();
  const toId = useId();
  const [message, setMessage] = useState(filters.message ?? "");
  const timer = useRef<number>(undefined);

  /** Rewrites the query string, dropping the page: a new filter starts over. */
  function apply(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `/admin/logs?${query}` : "/admin/logs");
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function onMessageChange(value: string) {
    setMessage(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => apply({ q: value }),
      searchDebounceMs,
    );
  }

  return (
    <div
      role="group"
      aria-label={t("filters-label")}
      className="flex flex-wrap items-end gap-3 rounded-admin-card border border-admin-card-border bg-admin-card p-4"
    >
      <label className="flex flex-col gap-1 text-xs text-admin-dim">
        {t("filter-user")}
        <select
          id={userId}
          value={filters.user ?? ""}
          onChange={(event) => apply({ user: event.target.value })}
          className="admin-control admin-focus h-[var(--admin-control-h)] rounded-admin-control border border-admin-card-border bg-admin-card px-3 text-sm text-admin-text"
        >
          <option value="">{t("filter-user-all")}</option>
          {usernames.map((username) => (
            <option key={username} value={username}>
              {username}
            </option>
          ))}
        </select>
      </label>

      <div className="min-w-56 flex-1">
        <SearchInput
          label={t("filter-message")}
          placeholder={t("filter-message-placeholder")}
          value={message}
          onChange={onMessageChange}
        />
      </div>

      <label className="flex flex-col gap-1 text-xs text-admin-dim">
        {t("start")}
        <input
          id={fromId}
          type="date"
          value={filters.from ?? ""}
          onChange={(event) => apply({ from: event.target.value })}
          className="admin-control admin-focus h-[var(--admin-control-h)] rounded-admin-control border border-admin-card-border bg-admin-card px-3 text-sm text-admin-text"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-admin-dim">
        {t("end")}
        <input
          id={toId}
          type="date"
          value={filters.to ?? ""}
          onChange={(event) => apply({ to: event.target.value })}
          className="admin-control admin-focus h-[var(--admin-control-h)] rounded-admin-control border border-admin-card-border bg-admin-card px-3 text-sm text-admin-text"
        />
      </label>

      <AdminButton
        type="button"
        variant="ghost"
        onClick={() => {
          setMessage("");
          window.clearTimeout(timer.current);
          router.replace("/admin/logs");
        }}
      >
        {t("filter-reset")}
      </AdminButton>
    </div>
  );
}
