import { act } from "@testing-library/react";
import { createAppStore, defaultAppState } from "../../store";
import { Config } from "../../types";
import { walkAppState } from "../data/walk-app-state";
import {
  addBlock,
  duplicateBlock,
  moveBlock,
  moveBlockToZone,
  moveDestinations,
  nextInsertSpot,
  removeBlock,
} from "../block-actions";

const ROOT = "root:default-zone";
const config: Config = {
  components: {
    Text: { fields: {}, render: () => <div /> },
    Box: { fields: { items: { type: "slot" } }, render: () => <div /> },
  },
};
const text = (id: string) => ({ type: "Text", props: { id } });

const appStore = createAppStore();
const ids = (zone = ROOT) =>
  appStore.getState().state.indexes.zones[zone]?.contentIds ?? [];

function reset(selected?: { zone: string; index: number }) {
  appStore.setState(
    {
      ...appStore.getInitialState(),
      config,
      state: walkAppState(
        {
          ...defaultAppState,
          data: {
            ...defaultAppState.data,
            content: [
              text("a"),
              text("b"),
              text("c"),
              {
                type: "Box",
                props: { id: "box", items: [text("x"), text("y")] },
              },
            ],
          },
          ui: { ...defaultAppState.ui, itemSelector: selected ?? null },
        },
        config
      ),
    },
    true
  );
}

describe("block actions", () => {
  beforeEach(() => reset());

  it("moves a block one place down and up", async () => {
    await act(async () => {
      await moveBlock(appStore, { zone: ROOT, index: 0 }, "down");
    });
    expect(ids()).toEqual(["b", "a", "c", "box"]);

    await act(async () => {
      await moveBlock(appStore, { zone: ROOT, index: 2 }, "up");
    });
    expect(ids()).toEqual(["b", "c", "a", "box"]);
  });

  it("reports the edge instead of moving", async () => {
    let up, down;
    await act(async () => {
      up = await moveBlock(appStore, { zone: ROOT, index: 0 }, "up");
      down = await moveBlock(appStore, { zone: ROOT, index: 3 }, "down");
    });
    expect(up).toEqual({ ok: false, reason: "at-edge" });
    expect(down).toEqual({ ok: false, reason: "at-edge" });
    expect(ids()).toEqual(["a", "b", "c", "box"]);
  });

  it("tells the new position for the screen reader", async () => {
    let outcome;
    await act(async () => {
      outcome = await moveBlock(appStore, { zone: ROOT, index: 1 }, "down");
    });
    expect(outcome).toEqual({ ok: true, position: 3, total: 4, zone: ROOT });
  });

  it("keeps the selection on the block that moved", async () => {
    reset({ zone: ROOT, index: 0 });
    await act(async () => {
      await moveBlock(appStore, { zone: ROOT, index: 0 }, "down");
    });
    expect(appStore.getState().state.ui.itemSelector).toEqual({
      zone: ROOT,
      index: 1,
    });
    expect(appStore.getState().selectedItem?.props.id).toBe("a");
  });

  it("moves a block to the end of a slot", async () => {
    await act(async () => {
      await moveBlockToZone(appStore, { zone: ROOT, index: 0 }, "box:items");
    });
    expect(ids()).toEqual(["b", "c", "box"]);
    expect(ids("box:items")).toEqual(["x", "y", "a"]);
  });

  it("lists every zone but the ones inside the block itself", () => {
    const state = appStore.getState().state;
    const label = (zone: string) => zone;
    expect(
      moveDestinations(state, { zone: ROOT, index: 3 }, label).map(
        (d) => d.zone
      )
    ).toEqual([ROOT]);
    expect(
      moveDestinations(state, { zone: ROOT, index: 0 }, label).map(
        (d) => d.zone
      )
    ).toEqual(expect.arrayContaining([ROOT, "box:items"]));
  });

  it("adds after the selected block, else at the end of the page", async () => {
    expect(nextInsertSpot(appStore.getState().state)).toEqual({
      zone: ROOT,
      index: 4,
    });
    reset({ zone: ROOT, index: 1 });
    expect(nextInsertSpot(appStore.getState().state)).toEqual({
      zone: ROOT,
      index: 2,
    });
    await act(async () => {
      await addBlock(appStore, "Text");
    });
    expect(ids()).toHaveLength(5);
    expect(ids().slice(0, 2)).toEqual(["a", "b"]);
    expect(appStore.getState().state.indexes.nodes[ids()[2]].data.type).toBe(
      "Text"
    );
  });

  it("duplicates a block right after itself", () => {
    act(() => duplicateBlock(appStore, { zone: ROOT, index: 1 }));
    expect(ids()).toHaveLength(5);
    expect(ids()[1]).toBe("b");
    expect(ids()[2]).not.toBe("b");
  });
});

describe("Undo after Remove (krizaka-internal#3545)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    reset();
    // As the editor registers it: the starting state is the first entry, every change after it is recorded (debounced)
    const start = appStore.getState().state;
    appStore.setState({
      history: {
        ...appStore.getState().history,
        histories: [{ id: "start", state: start }],
        index: 0,
        initialAppState: start,
      },
    });
  });
  afterEach(() => jest.useRealTimers());

  it("brings the removed block back, at its place", () => {
    act(() => removeBlock(appStore, { zone: ROOT, index: 1 }));
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(ids()).toEqual(["a", "c", "box"]);

    act(() => appStore.getState().history.back());
    expect(ids()).toEqual(["a", "b", "c", "box"]);
  });

  it("does too when Undo comes right after, before the history has recorded the change", () => {
    act(() => removeBlock(appStore, { zone: ROOT, index: 1 }));
    act(() => appStore.getState().history.back());
    expect(ids()).toEqual(["a", "b", "c", "box"]);
  });
});
