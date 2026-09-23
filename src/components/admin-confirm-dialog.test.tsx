import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./admin-confirm-dialog";

afterEach(cleanup);

const messages = {
  admin: { common: { confirm: "Confirmer", cancel: "Annuler" } },
};

function renderDialog(
  props: Partial<Parameters<typeof ConfirmDialog>[0]> = {},
) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ConfirmDialog
        open
        title="Supprimer ce guide ?"
        description="Cette action est définitive."
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      />
    </NextIntlClientProvider>,
  );
  return { onConfirm, onCancel };
}

describe("Bloc 119: ConfirmDialog", () => {
  it("renders nothing while it is closed", () => {
    renderDialog({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is named by its question and described by its consequence", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog", { name: "Supprimer ce guide ?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("Cette action est définitive.");
  });

  it("opens with the focus on Annuler, not on the destructive button", () => {
    // A reflex Enter on a dialog that deletes something must cancel it.
    renderDialog();
    expect(screen.getByRole("button", { name: "Annuler" })).toHaveFocus();
  });

  it("falls back to the shared labels when the caller names none", () => {
    renderDialog();
    expect(
      screen.getByRole("button", { name: "Confirmer" }),
    ).toBeInTheDocument();
  });

  it("uses the caller's own verb when there is one", () => {
    renderDialog({ confirmLabel: "Supprimer" });
    expect(
      screen.getByRole("button", { name: "Supprimer" }),
    ).toBeInTheDocument();
  });

  it("confirms only on the confirm button", () => {
    const { onConfirm, onCancel } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancels on Escape and on a click outside", () => {
    const { onCancel } = renderDialog();
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
    cleanup();
    const second = renderDialog();
    fireEvent.mouseDown(
      screen.getByRole("dialog").parentElement as HTMLElement,
    );
    expect(second.onCancel).toHaveBeenCalledTimes(1);
  });

  it("stays put on a click inside the dialog", () => {
    const { onCancel } = renderDialog();
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("refuses a second click while the first is in flight", () => {
    const { onConfirm } = renderDialog({ busy: true });
    const confirm = screen.getByRole("button", { name: "Confirmer" });
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
