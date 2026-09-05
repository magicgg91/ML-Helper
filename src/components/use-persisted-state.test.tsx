import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePersistedState } from "./use-persisted-state";

type Counter = { count: number };

function isCounter(value: unknown): value is Counter {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Partial<Counter>).count === "number"
  );
}

function parseCounter(raw: string): Counter | undefined {
  const parsed: unknown = JSON.parse(raw);
  return isCounter(parsed) ? parsed : undefined;
}

const key = "mlhelper_test_counter";

function Probe({
  serialize,
  onPersist,
}: {
  serialize?: (value: Counter) => string;
  onPersist?: (value: Counter) => void;
} = {}) {
  const [value, setValue, loaded] = usePersistedState<Counter>(key, {
    initial: () => ({ count: 0 }),
    parse: parseCounter,
    serialize,
    onPersist,
  });
  return (
    <button type="button" onClick={() => setValue({ count: value.count + 1 })}>
      {loaded ? "loaded" : "loading"}:{value.count}
    </button>
  );
}

describe("usePersistedState", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("starts from the initial value and only then adopts what storage holds", async () => {
    localStorage.setItem(key, JSON.stringify({ count: 7 }));
    render(<Probe />);
    // The read is deferred, so the first paint matches what the server sent.
    expect(screen.getByRole("button")).toHaveTextContent("loading:0");
    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveTextContent("loaded:7"),
    );
  });

  it("falls back to the initial value when parse rejects the stored shape", async () => {
    localStorage.setItem(key, JSON.stringify({ count: "seven" }));
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveTextContent("loaded:0"),
    );
  });

  it("falls back to the initial value when the stored value is not JSON", async () => {
    localStorage.setItem(key, "{ not json");
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveTextContent("loaded:0"),
    );
  });

  it("does not write back before the deferred read has landed", async () => {
    localStorage.setItem(key, JSON.stringify({ count: 7 }));
    render(<Probe />);
    // Were the write ungated, this initial-value render would already have
    // overwritten the stored 7 with 0.
    expect(localStorage.getItem(key)).toBe(JSON.stringify({ count: 7 }));
    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveTextContent("loaded:7"),
    );
  });

  it("persists later changes", async () => {
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveTextContent("loaded:0"),
    );
    act(() => screen.getByRole("button").click());
    await waitFor(() =>
      expect(localStorage.getItem(key)).toBe(JSON.stringify({ count: 1 })),
    );
  });

  it("uses the caller's serialize and notifies via onPersist", async () => {
    const onPersist = vi.fn();
    render(
      <Probe
        serialize={(value) => JSON.stringify({ ...value, v: 2 })}
        onPersist={onPersist}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveTextContent("loaded:0"),
    );
    act(() => screen.getByRole("button").click());
    await waitFor(() =>
      expect(localStorage.getItem(key)).toBe(
        JSON.stringify({ count: 1, v: 2 }),
      ),
    );
    expect(onPersist).toHaveBeenCalledWith({ count: 1 });
  });

  it("stays usable when storage itself throws", async () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("storage disabled");
      });
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("storage disabled");
      });
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveTextContent("loaded:0"),
    );
    act(() => screen.getByRole("button").click());
    expect(screen.getByRole("button")).toHaveTextContent("loaded:1");
    getItem.mockRestore();
    setItem.mockRestore();
  });
});
