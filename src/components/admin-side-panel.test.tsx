import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminButton } from "./admin-button";
import { SidePanel } from "./admin-side-panel";

afterEach(cleanup);

const messages = { admin: { common: { close: "Fermer" } } };

function renderPanel(props: Partial<Parameters<typeof SidePanel>[0]> = {}) {
  const onClose = vi.fn();
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <SidePanel
        open
        title="Nouvel utilisateur"
        description="Le compte est actif dès sa création."
        onClose={onClose}
        footer={<AdminButton variant="primary">Créer</AdminButton>}
        {...props}
      >
        <label>
          Identifiant
          <input name="username" />
        </label>
      </SidePanel>
    </NextIntlClientProvider>,
  );
  return onClose;
}

describe("Bloc 119: SidePanel", () => {
  it("renders nothing while it is closed", () => {
    renderPanel({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is a modal dialog named by its heading", () => {
    renderPanel();
    const panel = screen.getByRole("dialog", { name: "Nouvel utilisateur" });
    expect(panel).toHaveAttribute("aria-modal", "true");
  });

  it("holds the form it was given, and its footer", () => {
    renderPanel();
    expect(screen.getByLabelText("Identifiant")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer" })).toBeInTheDocument();
  });

  it("closes on its own button, on Escape and on the backdrop", () => {
    const onClose = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.mouseDown(
      screen.getByRole("dialog").parentElement as HTMLElement,
    );
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("traps the keyboard inside the panel", () => {
    // The panel opens on its first control — the close button, which is also
    // the first thing in reading order — and Shift+Tab from there wraps to
    // the last, rather than walking into the list of users still rendered
    // behind the panel.
    renderPanel();
    const close = screen.getByRole("button", { name: "Fermer" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "Créer" })).toHaveFocus();
  });
});
