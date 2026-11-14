/**
 * Dragging is for a fine pointer (a mouse, a pen). A phone's finger is not precise enough to drop a block where it
 * belongs and scrolling would fight it: there, every move goes through a button or a key (WCAG 2.2, 2.5.7).
 * Read at the moment a drag could start, so a device that changes its primary pointer is followed.
 */
export const isFinePointer = (): boolean =>
  typeof window === "undefined" ||
  typeof window.matchMedia !== "function" ||
  !window.matchMedia("(pointer: coarse)").matches;
