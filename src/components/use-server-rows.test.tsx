import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useServerRows } from "./use-server-rows";

afterEach(cleanup);

/**
 * Bloc 128: the rule the admin's lists share — state that follows the server
 * instead of keeping what it was mounted with.
 *
 * Exercised through a component rather than renderHook, because what matters
 * is what ends up on screen after the server re-renders, which is the thing
 * the language switch was getting wrong.
 */
function List({ rows }: { rows: string[] }) {
  const [shown, setShown] = useServerRows(rows);
  return (
    <div>
      <ul>
        {shown.map((row) => (
          <li key={row}>{row}</li>
        ))}
      </ul>
      <button type="button" onClick={() => setShown((now) => now.slice(1))}>
        drop
      </button>
    </div>
  );
}

const items = () =>
  screen.queryAllByRole("listitem").map((node) => node.textContent);

describe("Bloc 128: rows that follow the server", () => {
  it("shows what it was given", () => {
    render(<List rows={["Classement", "Coût de Ville"]} />);
    expect(items()).toEqual(["Classement", "Coût de Ville"]);
  });

  it("takes the new rows when the server re-renders", () => {
    // The language switch, in one line: same rows, translated, from a server
    // render that happens without the page reloading.
    const { rerender } = render(
      <List rows={["Classement", "Coût de Ville"]} />,
    );
    rerender(<List rows={["Ranking", "City Cost"]} />);
    expect(items()).toEqual(["Ranking", "City Cost"]);
  });

  it("keeps what the list did locally until the server speaks again", () => {
    const rows = ["Classement", "Coût de Ville"];
    const { rerender } = render(<List rows={rows} />);
    fireEvent.click(screen.getByRole("button", { name: "drop" }));
    expect(items()).toEqual(["Coût de Ville"]);
    // A re-render with the very same array is not a new server answer, so it
    // must not undo the deletion the list just made.
    rerender(<List rows={rows} />);
    expect(items()).toEqual(["Coût de Ville"]);
  });

  it("lets the server win once it really answers again", () => {
    // Every caller writes to the server before it touches this state, so a
    // fresh list already carries what the list did — here, the deletion.
    const { rerender } = render(
      <List rows={["Classement", "Coût de Ville"]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "drop" }));
    rerender(<List rows={["City Cost"]} />);
    expect(items()).toEqual(["City Cost"]);
  });
});
