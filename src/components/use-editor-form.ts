"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSaveStatus } from "./use-save-status";

/**
 * Bloc 119 §3 bis: the form state every edit screen has — what is on screen,
 * what the server holds, whether the two differ, and one save that covers the
 * whole screen.
 *
 * Before this, each editor kept only what was typed and never what was
 * stored, so "unsaved" was a question no screen could answer, and Annuler did
 * not exist. Keeping the stored snapshot beside the working copy answers both
 * with the same two lines.
 *
 * `body` is what goes on the wire — some routes take the value as it is,
 * others wrap it ({ tiers }, { percentages }). `adopt` reads the save's own
 * answer back into the form for the routes that normalise what they store
 * (Bloc 107/A): showing the typed value after a save the route rewrote is how
 * a wrong parameter survives a check.
 */
export function useEditorForm<T>({
  initial,
  endpoint,
  method = "PUT",
  body = (value: T) => value,
  adopt,
  validate,
}: {
  initial: T;
  endpoint: string;
  method?: "PUT" | "PATCH" | "POST";
  body?: (value: T) => unknown;
  adopt?: (stored: unknown) => T;
  /**
   * Checked before anything leaves the browser; a message stops the save.
   * It exists for one state the old screens could not reach: a field the
   * admin emptied. `<input type="number">` turned that into 0 on the way
   * out, so the guard had nowhere to live.
   */
  validate?: (value: T) => string | undefined;
}) {
  const t = useTranslations("admin.parameters");
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const status = useSaveStatus();

  // Structural comparison, not identity: an editor that rebuilds its object
  // on every keystroke would otherwise always look dirty. Both sides are
  // built from the same shape, so the key order matches.
  const dirty = useMemo(
    () => JSON.stringify(value) !== JSON.stringify(saved),
    [value, saved],
  );

  const save = useCallback(async () => {
    const problem = validate?.(value);
    if (problem) {
      status.error(problem);
      return;
    }
    status.pending(t("saving"));
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body(value)),
      });
      if (!response.ok) {
        status.error(t("error", { status: response.status }));
        return;
      }
      const stored = adopt
        ? adopt(await response.json().catch(() => undefined))
        : value;
      setValue(stored);
      setSaved(stored);
      status.success(t("saved"));
    } catch {
      status.error(t("server-error"));
    }
  }, [adopt, body, endpoint, method, status, t, validate, value]);

  /** Back to what the server holds — the header's Annuler. */
  const cancel = useCallback(() => {
    setValue(saved);
    status.reset();
  }, [saved, status]);

  return {
    value,
    setValue,
    dirty,
    saving: status.isPending,
    message: status.message,
    save,
    cancel,
  };
}
