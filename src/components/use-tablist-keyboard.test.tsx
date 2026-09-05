import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { handleTablistKeydown } from "./use-tablist-keyboard";

afterEach(cleanup);

// Bloc 91/F5: the shared WAI-ARIA Tabs arrow-key handler.
function Tablist() {
  return (
    <div role="tablist" onKeyDown={handleTablistKeydown}>
      <button type="button" role="tab" tabIndex={0}>
        One
      </button>
      <button type="button" role="tab" tabIndex={-1} disabled>
        Two (disabled)
      </button>
      <button type="button" role="tab" tabIndex={-1}>
        Three
      </button>
    </div>
  );
}

describe("handleTablistKeydown", () => {
  const tab = (name: string) => screen.getByRole("tab", { name });

  it("ArrowRight moves focus to the next enabled tab, skipping disabled ones", () => {
    render(<Tablist />);
    tab("One").focus();
    fireEvent.keyDown(tab("One"), { key: "ArrowRight" });
    expect(tab("Three")).toHaveFocus();
  });

  it("ArrowRight wraps from the last tab back to the first", () => {
    render(<Tablist />);
    tab("Three").focus();
    fireEvent.keyDown(tab("Three"), { key: "ArrowRight" });
    expect(tab("One")).toHaveFocus();
  });

  it("ArrowLeft wraps from the first tab to the last enabled one", () => {
    render(<Tablist />);
    tab("One").focus();
    fireEvent.keyDown(tab("One"), { key: "ArrowLeft" });
    expect(tab("Three")).toHaveFocus();
  });

  it("Home and End jump to the first and last enabled tabs", () => {
    render(<Tablist />);
    tab("Three").focus();
    fireEvent.keyDown(tab("Three"), { key: "Home" });
    expect(tab("One")).toHaveFocus();
    fireEvent.keyDown(tab("One"), { key: "End" });
    expect(tab("Three")).toHaveFocus();
  });

  it("ignores other keys", () => {
    render(<Tablist />);
    tab("One").focus();
    fireEvent.keyDown(tab("One"), { key: "a" });
    expect(tab("One")).toHaveFocus();
  });
});
