import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFocusTrap } from "./use-focus-trap";

afterEach(cleanup);

function Overlay({
  open,
  onClose,
  empty = false,
}: {
  open: boolean;
  onClose: () => void;
  empty?: boolean;
}) {
  const container = useFocusTrap<HTMLDivElement>(open, onClose);
  if (!open) return null;
  return (
    <div ref={container} tabIndex={-1} data-testid="overlay">
      {!empty && (
        <>
          <button type="button">premier</button>
          <button type="button">milieu</button>
          <button type="button">dernier</button>
        </>
      )}
    </div>
  );
}

/** An opener and the overlay it opens, the way a real screen is laid out. */
function Screen({ empty = false }: { empty?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        ouvrir
      </button>
      <Overlay open={open} onClose={() => setOpen(false)} empty={empty} />
    </>
  );
}

const press = (key: string, shiftKey = false) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key, shiftKey });

describe("Bloc 119: the overlay keyboard trap", () => {
  it("moves the focus into the overlay when it opens", () => {
    render(<Overlay open onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "premier" })).toHaveFocus();
  });

  it("wraps forward from the last element to the first", () => {
    render(<Overlay open onClose={vi.fn()} />);
    screen.getByRole("button", { name: "dernier" }).focus();
    press("Tab");
    expect(screen.getByRole("button", { name: "premier" })).toHaveFocus();
  });

  it("wraps backward from the first element to the last", () => {
    render(<Overlay open onClose={vi.fn()} />);
    press("Tab", true);
    expect(screen.getByRole("button", { name: "dernier" })).toHaveFocus();
  });

  it("leaves a Tab in the middle of the overlay to the browser", () => {
    // The handler only acts at the two ends: interior moves are the browser's
    // own, and pre-empting them would break reading order in a real one.
    render(<Overlay open onClose={vi.fn()} />);
    const middle = screen.getByRole("button", { name: "milieu" });
    middle.focus();
    press("Tab");
    expect(middle).toHaveFocus();
  });

  it("keeps the focus on an overlay that has nothing focusable in it", () => {
    render(<Overlay open onClose={vi.fn()} empty />);
    const overlay = screen.getByTestId("overlay");
    expect(overlay).toHaveFocus();
    press("Tab");
    expect(overlay).toHaveFocus();
  });

  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(<Overlay open onClose={onClose} />);
    press("Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("gives the focus back to whatever opened it", () => {
    render(<Screen />);
    const opener = screen.getByRole("button", { name: "ouvrir" });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole("button", { name: "premier" })).toHaveFocus();
    press("Escape");
    expect(opener).toHaveFocus();
  });

  it("does nothing at all while it is inactive", () => {
    const onClose = vi.fn();
    render(
      <>
        <button type="button">dehors</button>
        <Overlay open={false} onClose={onClose} />
      </>,
    );
    const outside = screen.getByRole("button", { name: "dehors" });
    outside.focus();
    press("Escape");
    press("Tab");
    expect(onClose).not.toHaveBeenCalled();
    expect(outside).toHaveFocus();
  });
});
