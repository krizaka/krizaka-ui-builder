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
const navElement = () => document.querySelector("nav") as HTMLElement;
// The bar is the nav's sibling inside the bottom bar wrapper
const selectedBar = () => {
  const bar = navElement().nextElementSibling;
  return bar?.getAttribute("role") === "toolbar" ? (bar as HTMLElement) : null;
};
const undoButton = () =>
  Array.from(navElement().querySelectorAll("button")).find(
    (b) => b.textContent === "undo"
  ) as HTMLButtonElement;

beforeEach(async () => {
  render(
    <Puck
      config={config}
      data={data}
      iframe={{ enabled: false }}
      plugins={[outlinePlugin()]}
    />
  );
  await flush();
  fireEvent.click(screen.getAllByText("Outline")[0]);
  await flush();
});
afterEach(() => cleanup());

describe("on a phone the frequent actions sit in the bottom bar", () => {
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
