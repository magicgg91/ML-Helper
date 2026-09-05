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
  schedule,
}: {
  serialize?: (value: Counter) => string;
  onPersist?: (value: Counter) => void;
  schedule?: (run: () => void) => void;
} = {}) {
  const [value, setValue, loaded] = usePersistedState<Counter>(key, {
    initial: () => ({ count: 0 }),
    parse: parseCounter,
    serialize,
    onPersist,
    schedule,
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

  // Bloc 93 CI: folding the player settings panel into this hook silently
  // moved its initial read from a microtask to a macrotask. That is not an
  // equivalent refactor — a macrotask lets user edits and external writes
  // land first, and the deferred read then overwrites them. It showed up as
  // a test that failed ~1 run in 8 under CPU contention (0 in 10 on the
  // pre-refactor code). These pin the contract in both directions.
  describe("schedule", () => {
    it("defers to a macrotask by default, after any pending microtask", async () => {
      localStorage.setItem(key, JSON.stringify({ count: 7 }));
      render(<Probe />);
      // A microtask queued now still runs before the default read lands.
      let microtaskRanFirst = false;
      queueMicrotask(() => {
        microtaskRanFirst =
          screen.getByRole("button").textContent === "loading:0";
      });
      await waitFor(() =>
        expect(screen.getByRole("button")).toHaveTextContent("loaded:7"),
      );
      expect(microtaskRanFirst).toBe(true);
    });

    it("reads on a microtask when the caller asks for one", async () => {
      localStorage.setItem(key, JSON.stringify({ count: 7 }));
      render(<Probe schedule={queueMicrotask} />);
      // Already applied by the time a macrotask gets its turn — which is what
      // stops an interaction in the same tick from being overwritten.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(screen.getByRole("button")).toHaveTextContent("loaded:7");
    });

    it("does not apply a read that resolves after unmount", async () => {
      localStorage.setItem(key, JSON.stringify({ count: 7 }));
      let deferred: (() => void) | undefined;
      const { unmount } = render(
        <Probe
          schedule={(run) => {
            deferred = run;
          }}
        />,
      );
      unmount();
      // Running it now must not touch an unmounted tree.
      expect(() => deferred?.()).not.toThrow();
    });
  });

  // Bloc 93 (Codex PR #118): onPersist tells other mounted copies that storage
  // changed, and the settings panel reacts by RE-READING storage. Announcing a
  // write that never landed (quota, private mode) would hand it the old stored
  // value and silently revert the edit the user just made.
  it("does not broadcast a write that failed", async () => {
    const onPersist = vi.fn();
    render(<Probe onPersist={onPersist} />);
    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveTextContent("loaded:0"),
    );
    onPersist.mockClear();

    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    act(() => screen.getByRole("button").click());
    expect(onPersist).not.toHaveBeenCalled();
    // The UI still reflects the edit; only the broadcast is withheld.
    expect(screen.getByRole("button")).toHaveTextContent("loaded:1");
    setItem.mockRestore();

    // A later successful write broadcasts normally.
    act(() => screen.getByRole("button").click());
    await waitFor(() => expect(onPersist).toHaveBeenCalledWith({ count: 2 }));
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
