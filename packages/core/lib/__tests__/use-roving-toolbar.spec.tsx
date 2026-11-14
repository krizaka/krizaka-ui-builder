import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { nextRovingIndex, useRovingToolbar } from "../use-roving-toolbar";

afterEach(cleanup);

describe("nextRovingIndex", () => {
  it("moves with the arrows of the orientation and wraps around", () => {
    expect(nextRovingIndex("ArrowRight", 0, 3)).toBe(1);
    expect(nextRovingIndex("ArrowRight", 2, 3)).toBe(0);
    expect(nextRovingIndex("ArrowLeft", 0, 3)).toBe(2);
    expect(nextRovingIndex("ArrowDown", 0, 3)).toBeNull();
    expect(nextRovingIndex("ArrowDown", 0, 3, "vertical")).toBe(1);
    expect(nextRovingIndex("ArrowUp", 0, 3, "both")).toBe(2);
  });

  it("goes to the ends with Home and End and ignores other keys", () => {
    expect(nextRovingIndex("Home", 2, 3)).toBe(0);
    expect(nextRovingIndex("End", 0, 3)).toBe(2);
    expect(nextRovingIndex("a", 0, 3)).toBeNull();
    expect(nextRovingIndex("Home", 0, 0)).toBeNull();
  });
});

const Bar = ({ disabled = false }: { disabled?: boolean }) => {
  const props = useRovingToolbar<HTMLDivElement>({ label: "Tools" });
  return (
    <div {...props}>
      <button type="button">One</button>
      <button type="button" disabled={disabled}>
        Two
      </button>
      <button type="button">Three</button>
    </div>
  );
};

const flush = () => act(async () => {});
const tabIndexes = () =>
  screen.getAllByRole("button").map((b) => b.getAttribute("tabindex"));

describe("useRovingToolbar", () => {
  it("is a labelled toolbar with one Tab stop", async () => {
    render(<Bar />);
    await flush();
    expect(screen.getByRole("toolbar", { name: "Tools" })).toBeInTheDocument();
    expect(tabIndexes()).toEqual(["0", "-1", "-1"]);
  });

  it("moves the focus and the Tab stop with the arrow keys", async () => {
    render(<Bar />);
    await flush();
    const [one, two, three] = screen.getAllByRole("button");
    one.focus();
    fireEvent.keyDown(one, { key: "ArrowRight" });
    expect(two).toHaveFocus();
    expect(tabIndexes()).toEqual(["-1", "0", "-1"]);
    fireEvent.keyDown(two, { key: "End" });
    expect(three).toHaveFocus();
    fireEvent.keyDown(three, { key: "ArrowRight" });
    expect(one).toHaveFocus();
    fireEvent.keyDown(one, { key: "ArrowLeft" });
    expect(three).toHaveFocus();
    fireEvent.keyDown(three, { key: "Home" });
    expect(one).toHaveFocus();
  });

  it("skips a disabled button", async () => {
    render(<Bar disabled />);
    await flush();
    const [one, , three] = screen.getAllByRole("button");
    one.focus();
    fireEvent.keyDown(one, { key: "ArrowRight" });
    expect(three).toHaveFocus();
  });

  it("gives the Tab stop to another button when the one that had it is disabled", async () => {
    const { rerender } = render(<Bar />);
    await flush();
    const [one] = screen.getAllByRole("button");
    (one as HTMLButtonElement).disabled = true;
    await flush();
    expect(tabIndexes()).toEqual(["-1", "0", "-1"]);
    rerender(<Bar />);
  });
});
