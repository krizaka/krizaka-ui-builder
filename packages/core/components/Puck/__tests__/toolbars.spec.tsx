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

const config: Config = {
  components: {
    Alpha: { label: "Alpha", fields: {}, render: () => <div>Alpha</div> },
    Beta: { label: "Beta", fields: {}, render: () => <div>Beta</div> },
  },
};
const data = {
  root: {},
  content: ["Alpha", "Beta"].map((type, i) => ({
    type,
    props: { id: `${type}-${i}` },
  })),
};
const flush = () => act(async () => {});
const all = { hidden: true } as const;

const renderEditor = async () => {
  render(
    <Puck
      config={config}
      data={data}
      iframe={{ enabled: false }}
      plugins={[outlinePlugin(), blocksPlugin()]}
      onPublish={() => undefined}
      contentLanguage={{
        value: "fr",
        options: [
          { value: "fr", label: "Français" },
          { value: "en", label: "English" },
        ],
        onChange: onLanguage,
      }}
    />
  );
  await flush();
  // Puck stays hidden until it has measured itself; the accessible names are empty while it is.
  document.querySelector<HTMLElement>(".Puck")!.style.visibility = "visible";
};
const onLanguage = jest.fn();
const tabStops = (bar: HTMLElement) =>
  within(bar)
    .getAllByRole("button", all)
    .filter((b) => b.getAttribute("tabindex") === "0");

afterEach(() => cleanup());

describe("the header", () => {
  beforeEach(renderEditor);

  it("holds one primary action", () => {
    const header = screen.getByRole("banner", all);
    expect(header.querySelectorAll("[data-variant='primary']")).toHaveLength(1);
    expect(within(header).getByText("Publish")).toBeInTheDocument();
  });

  it("holds the content language as a segmented control that tells the chosen one", () => {
    const header = screen.getByRole("banner", all);
    const group = within(header).getByRole("group", {
      name: "Content language",
      ...all,
    });
    const [fr, en] = within(group).getAllByRole("button", all);
    expect(fr).toHaveAttribute("aria-pressed", "true");
    expect(en).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(en);
    expect(onLanguage).toHaveBeenCalledWith("en");
  });

  it("gives Undo and Redo a 40 px size, a tooltip and their shortcut", () => {
    const header = screen.getByRole("banner", all);
    const undo = within(header).getByRole("button", { name: "undo", ...all });
    const redo = within(header).getByRole("button", { name: "redo", ...all });
    expect(undo).toHaveAttribute("data-size", "large");
    expect(redo).toHaveAttribute("data-size", "large");
    expect(undo).toHaveAttribute("title", "undo (Ctrl+Z)");
    expect(undo).toHaveAttribute("aria-keyshortcuts", "Control+Z");
    expect(redo).toHaveAttribute("title", "redo (Ctrl+Shift+Z)");
  });

  it("is one toolbar with one Tab stop and arrow keys inside", async () => {
    const header = screen.getByRole("toolbar", {
      name: "Page actions",
      ...all,
    });
    await flush();
    const [stop] = tabStops(header);
    expect(tabStops(header)).toHaveLength(1);
    stop.focus();
    fireEvent.keyDown(stop, { key: "ArrowRight" });
    expect(header.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(stop);
    expect(tabStops(header)).toEqual([document.activeElement]);
  });
});

describe("the panel bar", () => {
  beforeEach(renderEditor);

  it("is one toolbar with one Tab stop", async () => {
    const bar = screen.getByRole("toolbar", { name: "Editor panels", ...all });
    await flush();
    expect(tabStops(bar)).toHaveLength(1);
    const buttons = within(bar).getAllByRole("button", all);
    expect(buttons.length).toBeGreaterThan(1);
    buttons[0].focus();
    fireEvent.keyDown(buttons[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(buttons[1]);
  });
});
