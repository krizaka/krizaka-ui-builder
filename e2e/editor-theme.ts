import type { Page } from "@playwright/test";
import { EDITOR, previewBlocks } from "./editor-task-cost";

/* What the editor looks like in each theme of the host: the colours it actually paints, read from the page. Pure measuring. */

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export type Painted = {
  /** The page's theme class: « light » is on <html> in the light theme only. */
  htmlIsLight: boolean;
  /** Same, inside the canvas (the preview iframe). */
  canvasIsLight: boolean;
  /** The background of the editor's root, as the browser resolves it. */
  background: string;
  /** The text colour of the editor's root. */
  text: string;
};

export const paint = (page: Page): Promise<Painted> =>
  page.locator(EDITOR).evaluate((editor) => {
    const frame = editor.querySelector("iframe");
    // The first opaque background found from the editor's first panel up: what the eye sees behind the controls.
    const panel = editor.querySelector("button") ?? editor;
    let background = "rgba(0, 0, 0, 0)";
    for (let n: Element | null = panel; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c !== "rgba(0, 0, 0, 0)") {
        background = c;
        break;
      }
    }
    return {
      htmlIsLight: document.documentElement.classList.contains("light"),
      canvasIsLight:
        frame?.contentDocument?.documentElement.classList.contains("light") ??
        false,
      background,
      text: getComputedStyle(panel).color,
    };
  });

/** Selects the first block of the page, so the block's own bar (the floating one on a phone) is on screen. */
export const selectFirstBlock = async (page: Page): Promise<void> => {
  await previewBlocks(page).first().click();
  // The bars are laid out after the selection: wait until the painted state stops changing.
  await page.waitForTimeout(1200);
};

/* A colour read from the page as "rgb(r, g, b)" or "rgba(r, g, b, a)". */
type Rgba = [number, number, number, number];
const parse = (css: string): Rgba => {
  const n = css.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0];
  return [n[0] ?? 0, n[1] ?? 0, n[2] ?? 0, n[3] ?? 1];
};
const channel = (v: number): number => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: Rgba): number =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

/** The WCAG contrast ratio of two opaque colours (1 to 21). */
export const contrast = (a: string, b: string): number => {
  const [la, lb] = [luminance(parse(a)), luminance(parse(b))];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

export type Pair = {
  label: string;
  text: string;
  background: string;
  /** A control that shows an icon only: WCAG asks 3:1 for it, 4.5:1 for text. */
  iconOnly: boolean;
};

/** Every visible control of the editor with its text colour and the first opaque background behind it. */
export const controlPairs = (page: Page): Promise<Pair[]> =>
  page.locator(EDITOR).evaluate((editor) => {
    const opaque = (el: Element | null): string => {
      for (let n = el; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c;
      }
      return "rgb(255, 255, 255)";
    };
    const shown = (el: Element) => el.getClientRects().length > 0;
    return [
      ...editor.querySelectorAll("button, [role=tab], label, h1, h2, h3, a"),
    ]
      .filter(shown)
      .filter((el) => !(el as HTMLButtonElement).disabled)
      .map((el) => ({
        el,
        text: (el.textContent ?? "").trim(),
        name: el.getAttribute("aria-label") ?? el.getAttribute("title") ?? "",
      }))
      .filter(({ text, name }) => text !== "" || name !== "")
      .map(({ el, text, name }) => ({
        label: (text || name).slice(0, 30),
        text: getComputedStyle(el).color,
        background: opaque(el),
        iconOnly: text === "",
      }));
  });

/** The toolbars of the selected block that are on screen: the one inside the preview and the floating one. */
export const visibleBlockBars = async (
  page: Page
): Promise<{ inCanvas: number; floating: number }> => {
  const count = (l: ReturnType<Page["locator"]>) =>
    l.evaluateAll(
      (els) => els.filter((e) => e.getClientRects().length > 0).length
    );
  return {
    inCanvas: await count(
      page.frameLocator(`${EDITOR} iframe`).first().locator("[role=toolbar]")
    ),
    floating: await count(
      page.locator(`${EDITOR} [role=toolbar][class*=SelectedBlockBar]`)
    ),
  };
};

export type FocusRing = { label: string; ring: string; surface: string };

/** Focuses each button of the visible block bars with the keyboard and reads its ring colour and the surface behind it. */
export const focusRings = async (page: Page): Promise<FocusRing[]> => {
  const rings: FocusRing[] = [];
  const spots = [
    page.locator(`${EDITOR} [class*=SelectedBlockBar-button]:not([disabled])`),
    page
      .frameLocator(`${EDITOR} iframe`)
      .first()
      .locator("[role=toolbar] button:not([disabled])"),
  ];
  for (const spot of spots) {
    const first = spot.first();
    if (!(await first.isVisible().catch(() => false))) continue;
    await page.keyboard.press("Tab");
    await first.focus();
    rings.push(
      await first.evaluate((el) => {
        const style = getComputedStyle(el);
        let surface = "rgb(255, 255, 255)";
        for (let n: Element | null = el; n; n = n.parentElement) {
          const c = getComputedStyle(n).backgroundColor;
          if (c !== "rgba(0, 0, 0, 0)" && c !== "transparent") {
            surface = c;
            break;
          }
        }
        return {
          label:
            el.getAttribute("title") ?? el.getAttribute("aria-label") ?? "",
          ring: style.outlineStyle === "none" ? "none" : style.outlineColor,
          surface,
        };
      })
    );
  }
  return rings;
};
