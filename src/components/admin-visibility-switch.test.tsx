import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VisibilitySwitch } from "./admin-visibility-switch";

afterEach(cleanup);

const messages = {
  admin: { common: { visible: "Visible", hidden: "Masqué" } },
};

function renderSwitch(props: Partial<Parameters<typeof VisibilitySwitch>[0]>) {
  const onChange = vi.fn();
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <VisibilitySwitch
        checked={false}
        onChange={onChange}
        label="Visibilité de Coût de Ville"
        {...props}
      />
    </NextIntlClientProvider>,
  );
  return onChange;
}

describe("Bloc 119: VisibilitySwitch", () => {
  it("announces what it controls and whether it is on", () => {
    renderSwitch({ checked: true });
    const control = screen.getByRole("switch", {
      name: "Visibilité de Coût de Ville",
    });
    expect(control).toHaveAttribute("aria-checked", "true");
  });

  it("shows the state in words as well", () => {
    renderSwitch({ checked: false });
    expect(screen.getByText("Masqué")).toBeInTheDocument();
  });

  it("asks for the opposite state when clicked", () => {
    const onChange = renderSwitch({ checked: true });
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("does nothing when it is disabled", () => {
    // The own-account rules of the Users screen rely on this: a user may not
    // deactivate themselves, and the row's switch is greyed rather than gone.
    const onChange = renderSwitch({ checked: true, disabled: true });
    const control = screen.getByRole("switch");
    expect(control).toBeDisabled();
    fireEvent.click(control);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Bloc 119: the words beside the switch", () => {
  it("says Visible / Masqué by default", () => {
    renderSwitch({ checked: true });
    expect(screen.getByText("Visible")).toBeInTheDocument();
  });

  it("takes the screen's own words when it has some", () => {
    // An account is active or disabled, not visible or hidden.
    renderSwitch({
      checked: false,
      labels: { on: "Actif", off: "Désactivé" },
    });
    expect(screen.getByText("Désactivé")).toBeInTheDocument();
    expect(screen.queryByText("Masqué")).toBeNull();
  });
});
