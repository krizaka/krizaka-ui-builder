export type HistoryDirection = "undo" | "redo";

const SHORTCUTS = {
  apple: { undo: "⌘Z", redo: "⇧⌘Z" },
  other: { undo: "Ctrl+Z", redo: "Ctrl+Shift+Z" },
} as const;

/** The shortcut the history hotkeys answer to (store/slices/history.ts), written for the platform: ⌘Z / Ctrl+Z. */
export function historyShortcut(
  direction: HistoryDirection,
  isApple: boolean
): string {
  return SHORTCUTS[isApple ? "apple" : "other"][direction];
}

export const isApplePlatform = (): boolean =>
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad/i.test(navigator.platform);
