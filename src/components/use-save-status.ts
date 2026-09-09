"use client";

import { useCallback, useMemo, useState } from "react";

export type SaveTone = "idle" | "pending" | "success" | "error";

/**
 * Bloc 93/M1: the admin save feedback state machine, which 6 editors each
 * carried their own variant of, in 3 different shapes — a bare `status`
 * string, a `message` string, or a `message` plus a separate `success` flag.
 *
 * The shapes were not merely different, they behaved differently: the editors
 * that pass a bare string to EditorActionBar (Consommables, Évènements, the
 * legal notice) rendered "Enregistré" in exactly the same neutral style as
 * "Erreur serveur", so a successful save was indistinguishable from a failed
 * one — while EditableReferenceTable did distinguish them. Carrying the tone
 * alongside the message is what makes that impossible to get wrong again.
 */
export function useSaveStatus() {
  const [state, setState] = useState<{ message: string; tone: SaveTone }>({
    message: "",
    tone: "idle",
  });

  const pending = useCallback(
    (message: string) => setState({ message, tone: "pending" }),
    [],
  );
  const success = useCallback(
    (message: string) => setState({ message, tone: "success" }),
    [],
  );
  const error = useCallback(
    (message: string) => setState({ message, tone: "error" }),
    [],
  );
  const reset = useCallback(() => setState({ message: "", tone: "idle" }), []);
  /** Resolves one request: its own message for each outcome. */
  const settle = useCallback(
    (ok: boolean, messages: { success: string; error: string }) =>
      setState({
        message: ok ? messages.success : messages.error,
        tone: ok ? "success" : "error",
      }),
    [],
  );

  return useMemo(
    () => ({
      message: state.message,
      tone: state.tone,
      isPending: state.tone === "pending",
      pending,
      success,
      error,
      settle,
      reset,
    }),
    [state, pending, success, error, settle, reset],
  );
}
