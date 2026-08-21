import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultPlayerSettings } from "../lib/player-settings";
import {
  playerSettingsChangedEvent,
  playerStorageKey,
} from "./player-settings-panel";
import { useSyncedLeague } from "./use-synced-league";

function Harness() {
  const [league, setLeague] = useSyncedLeague();
  return (
    <label>
      League
      <select
        value={league}
        onChange={(event) => setLeague(event.target.value as typeof league)}
      >
        <option value="">Choose</option>
        <option value="gold">Gold</option>
        <option value="diamond">Diamond</option>
        <option value="legend">Legend</option>
      </select>
    </label>
  );
}

describe("useSyncedLeague", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("uses a cached player league on initial load", () => {
    const settings = defaultPlayerSettings();
    settings.league = "diamond";
    localStorage.setItem(playerStorageKey, JSON.stringify(settings));
    render(<Harness />);
    expect(screen.getByRole("combobox", { name: "League" })).toHaveValue(
      "diamond",
    );
  });

  it("syncs an empty selector but preserves a manual choice", () => {
    render(<Harness />);
    const select = screen.getByRole("combobox", { name: "League" });
    expect(select).toHaveValue("");

    const settings = defaultPlayerSettings();
    settings.league = "diamond";
    localStorage.setItem(playerStorageKey, JSON.stringify(settings));
    act(() => window.dispatchEvent(new Event(playerSettingsChangedEvent)));
    expect(select).toHaveValue("diamond");

    fireEvent.change(select, { target: { value: "gold" } });
    settings.league = "legend";
    localStorage.setItem(playerStorageKey, JSON.stringify(settings));
    act(() => window.dispatchEvent(new Event(playerSettingsChangedEvent)));
    expect(select).toHaveValue("gold");
  });
});
