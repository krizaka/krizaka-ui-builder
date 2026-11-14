import { historyShortcut } from "../history-shortcut";

describe("historyShortcut", () => {
  it("writes the shortcut the history hotkeys answer to, for the platform", () => {
    expect(historyShortcut("undo", false)).toBe("Ctrl+Z");
    expect(historyShortcut("redo", false)).toBe("Ctrl+Shift+Z");
    expect(historyShortcut("undo", true)).toBe("⌘Z");
    expect(historyShortcut("redo", true)).toBe("⇧⌘Z");
  });
});
