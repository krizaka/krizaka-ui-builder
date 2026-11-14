import type { Locator, Page } from "@playwright/test";

/* What one editor task costs, measured on a real page: how many gestures, how many Tab stops, and where each command
   sits on the screen. Pure measuring: nothing here asserts. */

export const TASKS = ["add", "move", "remove", "undo", "language"] as const;
export type Task = (typeof TASKS)[number];

export const MODALITIES = ["pointer", "keyboard"] as const;
export type Modality = (typeof MODALITIES)[number];

/* Frequency levels of the target report (A every minute, B several times a page, C a few times). */
export type CommandLevel = "A" | "B" | "C";

export type CommandMeasure = {
  name: string;
  level: CommandLevel;
  widthPx: number;
  heightPx: number;
  /** Centre of the command as a share of the screen height (0 top, 1 bottom). */
  yFrac: number;
};

export type TaskMeasure = {
  /** Gestures (pointer) or key presses other than Tab (keyboard). null: the task cannot be done this way. */
  actions: number | null;
  /** Tab presses from the top of the page to the last command. null: cannot be done with the keyboard. */
  tabStops: number | null;
  /** Arrow-key presses inside a toolbar (#3547): a bar is one Tab stop, the arrows reach the rest. Not in `actions`. */
  arrowKeys?: number;
  commands: CommandMeasure[];
};

export type CellMeasure = Record<Task, TaskMeasure>;

export const FLOOR_PX = { phone: 44, desk: 32 } as const;

/* Labels the editor and its host page show, in French and English. */
export const LABELS = {
  undo: /^(annuler|undo)$/i,
  redo: /^(rétablir|redo)$/i,
  menuToggle: /barre de menu|menu bar/i,
  remove: /^(supprimer|delete|remove)$/i,
  moveUp: /^(monter|move up)$/i,
  blocksTab: /^(blocs|blocks)$/i,
  outlineTab: /^(plan|outline)$/i,
  contentLanguage: /^english$/i,
} as const;

/** The « Add » button of the Citation row of the block list. */
export const ADD_CITATION = /^(ajouter|add) citation$/i;

export const EDITOR = ".kz-builder-editor";
const PREVIEW = `${EDITOR} iframe`;
/* The blocks of the page itself, not the items nested inside a block. */
const BLOCK =
  "[data-puck-component]:not([data-puck-component] [data-puck-component])";
const DRAWER_ITEM = "[class*=DrawerItem-name]";
const MAX_TABS = 150;

export const previewBlocks = (page: Page): Locator =>
  page.frameLocator(PREVIEW).first().locator(BLOCK);
export const drawerItem = (page: Page, name: string): Locator =>
  page.locator(DRAWER_ITEM, { hasText: name }).first().locator("xpath=..");

export const blockCount = (page: Page): Promise<number> =>
  previewBlocks(page).count();
export const blockTexts = (page: Page): Promise<string[]> =>
  previewBlocks(page).evaluateAll((l) =>
    l.map((e) => (e as HTMLElement).innerText.slice(0, 24))
  );

export async function openEditor(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(PREVIEW, { timeout: 60_000 });
  await previewBlocks(page).first().waitFor({ timeout: 60_000 });
  await scrollEditorIntoPlace(page);
}

/** Every task starts with the editor at the same place on the screen, so the heights are comparable. */
export const scrollEditorIntoPlace = (page: Page): Promise<void> =>
  page
    .locator(EDITOR)
    .evaluate((e) =>
      window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 70)
    );

/** The element the keyboard is on, followed through the preview frame: tag, accessible name, size and place. */
export type Focus = {
  tag: string;
  name: string;
  rect: { w: number; h: number; cy: number };
  viewportHeight: number;
  /** The element is inside a WAI-ARIA toolbar (one Tab stop for the bar). */
  inToolbar: boolean;
};

export function activeFocus(page: Page): Promise<Focus | null> {
  return page.evaluate(() => {
    let doc: Document = document;
    let el: Element | null = doc.activeElement;
    let offset = 0;
    while (el instanceof HTMLIFrameElement && el.contentDocument) {
      offset += el.getBoundingClientRect().top;
      doc = el.contentDocument;
      el = doc.activeElement;
    }
    if (!el || el === doc.body) return null;
    const r = el.getBoundingClientRect();
    const name = (
      el.getAttribute("aria-label") ??
      el.getAttribute("title") ??
      el.textContent ??
      ""
    ).trim();
    return {
      tag: el.tagName,
      name: name.slice(0, 40),
      rect: { w: r.width, h: r.height, cy: offset + r.top + r.height / 2 },
      viewportHeight: window.innerHeight,
      inToolbar: !!el.closest('[role="toolbar"]'),
    };
  });
}

export const toCommand = (
  name: string,
  level: CommandLevel,
  f: Focus
): CommandMeasure => ({
  name,
  level,
  widthPx: Math.round(f.rect.w),
  heightPx: Math.round(f.rect.h),
  yFrac: Math.round((f.rect.cy / f.viewportHeight) * 100) / 100,
});

/** Put the Tab starting point at the very top of the page, as a visitor who just arrived. */
export function resetTabOrigin(page: Page): Promise<void> {
  return page.evaluate(() => {
    document.getElementById("kz-tab-origin")?.remove();
    const origin = document.createElement("span");
    origin.id = "kz-tab-origin";
    origin.tabIndex = -1;
    document.body.prepend(origin);
    window.scrollTo(0, 0);
    origin.focus();
  });
}

/* The arrow keys pressed inside toolbars during a task; playJourney reads and resets it. */
const arrowPresses = new WeakMap<Page, number>();
export const takeArrowKeys = (page: Page): number => {
  const n = arrowPresses.get(page) ?? 0;
  arrowPresses.set(page, 0);
  return n;
};
const MAX_ARROWS = 12;

const matches = (focus: Focus | null, name: RegExp, tag?: string) =>
  !!focus && name.test(focus.name) && (!tag || focus.tag === tag);

/**
 * In a toolbar the Tab lands on one button; the arrows reach the others. Only the presses that reach `name` are counted
 * (`takeArrowKeys`): a person who knows the bar does not walk the ones that miss.
 */
async function arrowTo(
  page: Page,
  name: RegExp,
  tag?: string
): Promise<Focus | null> {
  for (let presses = 1; presses <= MAX_ARROWS; presses += 1) {
    await page.keyboard.press("ArrowRight");
    const focus = await activeFocus(page);
    if (matches(focus, name, tag)) {
      arrowPresses.set(page, (arrowPresses.get(page) ?? 0) + presses);
      return focus;
    }
  }
  return null;
}

/**
 * Press Tab until the focus is on a button/tab named `name` (or a node whose text is `name`). Inside a toolbar, the
 * arrows walk the bar once before the next Tab. null: never reached.
 */
export async function tabTo(
  page: Page,
  name: RegExp,
  tag?: string
): Promise<{ stops: number | null; focus: Focus | null }> {
  for (let stops = 1; stops <= MAX_TABS; stops += 1) {
    await page.keyboard.press("Tab");
    let focus = await activeFocus(page);
    if (focus?.inToolbar && !matches(focus, name, tag))
      focus = (await arrowTo(page, name, tag)) ?? focus;
    if (matches(focus, name, tag)) return { stops, focus };
  }
  return { stops: null, focus: null };
}

/** Measure a command that is shown on the page, before the pointer uses it. */
export async function measureShown(
  page: Page,
  target: Locator,
  name: string,
  level: CommandLevel
): Promise<CommandMeasure> {
  /* The block bar re-mounts while the preview settles: a failed scroll only means the page is already in place. */
  await target.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => undefined);
  const box = await target.boundingBox();
  if (!box) throw new Error(`command "${name}" has no box`);
  /* CSS size, the same number the keyboard cell reads, whatever zoom the preview is at. */
  const css = await target.evaluate((el) => ({
    w: (el as HTMLElement).offsetWidth,
    h: (el as HTMLElement).offsetHeight,
  }));
  const viewportHeight = page.viewportSize()?.height ?? 1;
  return {
    name,
    level,
    widthPx: css.w,
    heightPx: css.h,
    yFrac: Math.round(((box.y + box.height / 2) / viewportHeight) * 100) / 100,
  };
}

/** A drag with the pointer, the way a person does it: press, move off, glide over, release. One gesture. */
export async function drag(
  page: Page,
  from: Locator,
  to: Locator,
  offsetY: number
): Promise<void> {
  const a = await from.boundingBox();
  const t = await to.boundingBox();
  if (!a || !t) throw new Error("drag: source or target has no box");
  const [ax, ay] = [a.x + a.width / 2, a.y + a.height / 2];
  await page.mouse.move(ax, ay);
  await page.mouse.down();
  await page.mouse.move(ax + 5, ay + 5, { steps: 3 });
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2 + offsetY, {
    steps: 20,
  });
  await page.waitForTimeout(300);
  await page.mouse.up();
  await page.waitForTimeout(600);
}

/** Whether a person could touch the element: the topmost thing at its centre is the element itself. */
export async function isReachable(target: Locator): Promise<boolean> {
  if (!(await target.isVisible())) return false;
  return target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const top = el.ownerDocument.elementFromPoint(
      r.left + r.width / 2,
      r.top + r.height / 2
    );
    return top !== null && el.contains(top);
  });
}
