export type HistoryDirection = "undo" | "redo";

/** The shortcut the history hotkeys answer to (store/slices/history.ts), written for the platform: ⌘Z / Ctrl+Z. */
export function historyShortcut(
  direction: HistoryDirection,
  isApple: boolean
): string {
  const shift = direction === "redo";
  return isApple ? `${shift ? "⇧" : ""}⌘Z` : `Ctrl+${shift ? "Shift+" : ""}Z`;
}

export const isApplePlatform = (): boolean =>
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad/i.test(navigator.platform);
