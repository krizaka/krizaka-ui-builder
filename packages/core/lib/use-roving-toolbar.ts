import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

export type RovingOrientation = "horizontal" | "vertical" | "both";

const ITEM_SELECTOR = "button, a[href]";

const KEYS = {
  next: { horizontal: "ArrowRight", vertical: "ArrowDown" },
  previous: { horizontal: "ArrowLeft", vertical: "ArrowUp" },
} as const;

/**
 * The index a key moves to inside a toolbar of `count` items, or null when the key is not one of the toolbar's.
 * The arrows wrap around (WAI-ARIA toolbar pattern); Home and End go to the ends.
 */
export function nextRovingIndex(
  key: string,
  index: number,
  count: number,
  orientation: RovingOrientation = "horizontal"
): number | null {
  if (count === 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  const axes =
    orientation === "both"
      ? (["horizontal", "vertical"] as const)
      : [orientation];
  if (axes.some((axis) => key === KEYS.next[axis])) return (index + 1) % count;
  if (axes.some((axis) => key === KEYS.previous[axis]))
    return (index - 1 + count) % count;
  return null;
}

/** An item the user can reach: enabled, and not hidden by the stylesheet (a closed menu, a breakpoint). */
const isReachable = (el: HTMLElement) =>
  !(el as HTMLButtonElement).disabled &&
  (el.checkVisibility ? el.checkVisibility() : true);

const itemsOf = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>(ITEM_SELECTOR));

/** One item has tabindex 0 (the Tab stop), every other item -1 (reached with the arrows). */
function syncTabStops(root: HTMLElement, active: HTMLElement | null) {
  const items = itemsOf(root);
  const reachable = items.filter(isReachable);
  const stop = active && reachable.includes(active) ? active : reachable[0];
  items.forEach((item) => {
    item.tabIndex = item === stop ? 0 : -1;
  });
}

/**
 * Makes a container one WAI-ARIA toolbar with a roving tabindex: one Tab stop for the whole bar, the arrows (and
 * Home / End) move between its buttons. Spread the result on the container. Items are found in the DOM, so any
 * button a host adds to the bar joins it, and a disabled or hidden one is skipped.
 */
export function useRovingToolbar<T extends HTMLElement>({
  label,
  orientation = "horizontal",
}: {
  label: string;
  orientation?: RovingOrientation;
}) {
  // A state ref: a bar that mounts late (the selected-block bar) still gets its observer.
  const [root, setRoot] = useState<T | null>(null);
  const active = useRef<HTMLElement | null>(null);

  const sync = useCallback(() => {
    if (root) syncTabStops(root, active.current);
  }, [root]);

  // Children re-render on their own (Undo becomes disabled), so watch the bar, not only its owner.
  useEffect(() => {
    if (!root) return;
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["disabled", "hidden", "class"],
    });
    window.addEventListener("resize", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [root, sync]);

  const onFocus = useCallback(
    (event: React.FocusEvent<T>) => {
      const target = event.target as HTMLElement;
      if (itemsOf(event.currentTarget).includes(target)) {
        active.current = target;
        sync();
      }
    },
    [sync]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<T>) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const reachable = itemsOf(event.currentTarget).filter(isReachable);
      const index = reachable.indexOf(event.target as HTMLElement);
      if (index === -1) return;
      const to = nextRovingIndex(
        event.key,
        index,
        reachable.length,
        orientation
      );
      if (to === null) return;
      event.preventDefault();
      active.current = reachable[to];
      reachable[to].focus();
    },
    [orientation]
  );

  return {
    ref: setRoot,
    role: "toolbar" as const,
    "aria-label": label,
    "aria-orientation": orientation === "both" ? undefined : orientation,
    onFocus,
    onKeyDown,
  };
}
