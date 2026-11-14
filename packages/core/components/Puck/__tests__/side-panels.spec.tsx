import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Config } from "../../../types";
import { dictionaryFr } from "../../../lib/dictionary-fr";

jest.mock("../styles.module.css");
/* The sidebar's class names, as written, so the test can tell an open panel from a folded one. */
jest.mock("../components/Sidebar/styles.module.css", () => ({
  __esModule: true,
  default: new Proxy({}, { get: (_t, key) => String(key) }),
}));
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

/** The viewport width the media queries answer for. */
let viewportWidth = 1440;
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: viewportWidth >= Number(/min-width: (\d+)px/.exec(query)?.[1]),
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

const config: Config = {
  root: { fields: { title: { type: "text" } } },
  components: {
    Alpha: { fields: {}, render: () => <div>Alpha</div> },
  },
};
const withoutPageFields: Config = { ...config, root: {} };

const flush = () => act(async () => {});
const renderEditor = async (
  editorConfig: Config,
  dictionary?: Record<string, string>
) => {
  render(
    <Puck
      config={editorConfig}
      data={{ root: {}, content: [] }}
      iframe={{ enabled: false }}
      dictionary={dictionary}
    />
  );
  await flush();
};
const leftPanel = () => document.querySelector(".Sidebar--left");

afterEach(() => {
  cleanup();
  viewportWidth = 1440;
});

describe("an empty fields panel says what to do", () => {
  it("shows the English sentence when no block is selected and the page has no field", async () => {
    await renderEditor(withoutPageFields);

    expect(
      screen.getAllByText("Choose a block to edit")[0]
    ).toBeInTheDocument();
  });

  it("shows the French sentence with the French dictionary", async () => {
    await renderEditor(withoutPageFields, dictionaryFr);

    expect(
      screen.getAllByText("Choisissez un bloc à modifier")[0]
    ).toBeInTheDocument();
  });

  it("keeps the page's own fields when the page has some", async () => {
    await renderEditor(config);

    expect(
      screen.queryByText("Choose a block to edit")
    ).not.toBeInTheDocument();
  });
});

describe("the blocks panel opens folded under 1280 px", () => {
  it("opens the blocks panel at 1440 px", async () => {
    viewportWidth = 1440;
    await renderEditor(config);

    expect(leftPanel()).toHaveClass("Sidebar--isVisible");
  });

  it("opens it folded as a rail at 1279 px", async () => {
    viewportWidth = 1279;
    await renderEditor(config);

    expect(leftPanel()).not.toHaveClass("Sidebar--isVisible");
  });
});
