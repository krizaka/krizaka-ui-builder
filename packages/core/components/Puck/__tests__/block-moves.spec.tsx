import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { Config } from "../../../types";

jest.mock("../styles.module.css");
jest.mock("@dnd-kit/react", () => {
  const original = jest.requireActual("@dnd-kit/react");
  return {
    ...original,
    DragDropProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useDroppable: () => ({ ref: () => undefined, isOver: false }),
    useDraggable: () => ({ ref: () => undefined, isDragging: false }),
  };
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }),
});
window.HTMLElement.prototype.scrollIntoView = jest.fn();
(global as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { Puck } from "../index";
import { outlinePlugin } from "../../../plugins/outline";
import { blocksPlugin } from "../../../plugins/blocks";

const block = (label: string) => ({
  label,
  fields: {},
  render: () => <div>{label}</div>,
});
const NAMES = ["Alpha", "Beta", "Gamma", "Delta", "Eps", "Zeta", "Eta", "Iota"];
const config: Config = {
  components: Object.fromEntries(NAMES.map((n) => [n, block(n)])),
};
const data = {
  root: {},
  content: ["Alpha", "Beta", "Gamma"].map((type, i) => ({
    type,
    props: { id: `${type}-${i}` },
  })),
};

const flush = () => act(async () => {});
const rowButtons = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-puck-layer-row]"));
const rowNames = () => rowButtons().map((b) => b.textContent);

const renderEditor = async (plugin: "outline" | "blocks") => {
  render(
    <Puck
      config={config}
      data={data}
      iframe={{ enabled: false }}
      plugins={[plugin === "outline" ? outlinePlugin() : blocksPlugin()]}
    />
  );
  await flush();
  // Puck is not visible to the accessibility tree until it has measured itself: open the plugin by its nav button
  fireEvent.click(
    screen.getAllByText(plugin === "outline" ? "Outline" : "Blocks")[0]
  );
  await flush();
};
const all = { hidden: true } as const;
/** What the outline's live region says (Puck has other status regions). */
const announcement = () =>
  screen
    .getAllByRole("status", all)
    .map((e) => e.textContent)
    .join(" ");

afterEach(() => cleanup());

describe("the outline moves a row without dragging", () => {
  beforeEach(() => renderEditor("outline"));

  it("Alt+ArrowDown moves the row, announces it and keeps the focus on the row", async () => {
    expect(rowNames()).toEqual(["Alpha", "Beta", "Gamma"]);
    const first = rowButtons()[0];
    first.focus();

    fireEvent.keyDown(first, { key: "ArrowDown", altKey: true });
    await flush();
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    });

    expect(rowNames()).toEqual(["Beta", "Alpha", "Gamma"]);
    expect(announcement()).toContain("Alpha moved to position 2 of 3");
    expect(document.activeElement).toBe(rowButtons()[1]);
  });

  it("says so at the edge and moves nothing", async () => {
    const first = rowButtons()[0];
    fireEvent.keyDown(first, { key: "ArrowUp", altKey: true });
    await flush();

    expect(rowNames()).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(announcement()).toContain("Alpha is already first");
  });

  it("ArrowDown without Alt does not move the row", async () => {
    fireEvent.keyDown(rowButtons()[0], { key: "ArrowDown" });
    await flush();
    expect(rowNames()).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("has a row menu: Move down, then Move to… another zone", async () => {
    fireEvent.click(screen.getAllByTitle("More actions for Alpha")[0]);
    await flush();
    const menu = screen.getByText(/Move down/);
    fireEvent.click(menu);
    await flush();
    expect(rowNames()).toEqual(["Beta", "Alpha", "Gamma"]);
    expect(announcement()).toContain("Alpha moved to position 2 of 3");
  });

  it("offers Move to… as a labelled select", async () => {
    fireEvent.click(screen.getAllByTitle("More actions for Alpha")[0]);
    await flush();
    const select = screen.getByLabelText("Move to…");
    expect(within(select).getAllByRole("option", all).length).toBeGreaterThan(
      1
    );
  });
});

describe("the block list adds without dragging", () => {
  beforeEach(() => renderEditor("blocks"));

  it("has an Add button on each row, and adding puts the block on the page", async () => {
    expect(screen.getAllByLabelText(/^Add /)).toHaveLength(NAMES.length);
    expect(rowNames()).toEqual(["Alpha", "Beta", "Gamma"]);
    fireEvent.click(screen.getByLabelText("Add Delta"));
    await flush();
    expect(rowNames()).toEqual(["Alpha", "Beta", "Gamma", "Delta"]);
  });

  it("shows a search from 8 blocks and filters the list", async () => {
    const search = screen.getByLabelText("Search blocks");
    fireEvent.change(search, { target: { value: "gam" } });
    await flush();
    expect(screen.getAllByLabelText(/^Add /)).toHaveLength(1);
    expect(screen.getByLabelText("Add Gamma")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "zzz" } });
    await flush();
    expect(screen.getByText("No block matches")).toBeInTheDocument();
  });
});

const navElement = () =>
  document.querySelector("[aria-label='Editor panels']") as HTMLElement;
// The bar is the nav's sibling inside the bottom bar wrapper
const selectedBar = () => {
  const bar = navElement().nextElementSibling;
  return bar?.getAttribute("role") === "toolbar" ? (bar as HTMLElement) : null;
};
const undoButton = () =>
  Array.from(navElement().querySelectorAll("button")).find(
    (b) => b.textContent === "undo"
  ) as HTMLButtonElement;

describe("on a phone the frequent actions sit in the bottom bar", () => {
  beforeEach(() => renderEditor("outline"));

  it("has Undo in the bottom bar, disabled until something changed, and it undoes in one tap", async () => {
    const undo = undoButton();
    expect(undo).toBeDisabled();

    fireEvent.click(rowButtons()[0]);
    await flush();
    fireEvent.click(within(selectedBar()!).getByLabelText("Move down"));
    await flush();
    expect(rowNames()).toEqual(["Beta", "Alpha", "Gamma"]);

    // The history records a change after its debounce
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    expect(undo).toBeEnabled();
    fireEvent.click(undo);
    await flush();
    expect(rowNames()).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("shows no floating bar until a block is selected", () => {
    expect(selectedBar()).toBeNull();
  });

  it("floats Move up, Move down, Duplicate and Remove for the selected block", async () => {
    fireEvent.click(rowButtons()[0]);
    await flush();
    const bar = within(selectedBar()!);
    const names = bar
      .getAllByLabelText(/./)
      .map((b) => b.getAttribute("aria-label"));
    expect(names).toEqual(["Move up", "Move down", "Duplicate", "Remove"]);
    expect(bar.getByLabelText("Move up")).toBeDisabled();
  });

  it("is one toolbar: one Tab stop, the arrows move between the enabled buttons", async () => {
    fireEvent.click(rowButtons()[1]);
    await flush();
    const bar = selectedBar()!;
    const buttons = within(bar).getAllByRole("button", all);
    expect(buttons.filter((b) => b.tabIndex === 0)).toHaveLength(1);
    buttons[0].focus();
    fireEvent.keyDown(buttons[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[1]);
    fireEvent.keyDown(buttons[1], { key: "End" });
    expect(document.activeElement).toBe(buttons[3]);
    expect(buttons.filter((b) => b.tabIndex === 0)).toEqual([buttons[3]]);
  });

  it("Duplicate and Remove act on the selected block", async () => {
    fireEvent.click(rowButtons()[1]);
    await flush();
    fireEvent.click(within(selectedBar()!).getByLabelText("Duplicate"));
    await flush();
    expect(rowNames()).toHaveLength(4);

    fireEvent.click(within(selectedBar()!).getByLabelText("Remove"));
    await flush();
    expect(rowNames()).toHaveLength(3);
  });
});
