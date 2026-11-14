import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { openEditor } from "./editor-task-cost";
import {
  THEMES,
  controlPairs,
  contrast,
  paint,
  selectFirstBlock,
} from "./editor-theme";

/* The editor in both themes of the host: the host page switches theme the way @krizaka/ui does (the stored mode, or the
   system's colour scheme), and the editor's painted colours must follow. THEME_SHOTS=<folder> also writes the renders. */

const SCREENS = {
  phone: { width: 360, height: 780 },
  desk: { width: 1440, height: 900 },
} as const;
const BUILDER_PATH = process.env.BUILDER_PATH ?? "/fr/builder";
const SHOTS = process.env.THEME_SHOTS;
const AA_TEXT = 4.5;
const AA_ICON = 3;

for (const [screen, viewport] of Object.entries(SCREENS)) {
  test(`the editor follows the host theme, ${screen}`, async ({ browser }) => {
    const painted = {} as Record<
      (typeof THEMES)[number],
      Awaited<ReturnType<typeof paint>>
    >;
    const weak = {} as Record<string, string[]>;
    for (const theme of THEMES) {
      const context = await browser.newContext({
        viewport,
        colorScheme: theme,
        hasTouch: screen === "phone",
      });
      const page = await context.newPage();
      await openEditor(page, BUILDER_PATH);
      await selectFirstBlock(page);
      painted[theme] = await paint(page);
      weak[theme] = (await controlPairs(page))
        .filter(
          (p) =>
            contrast(p.text, p.background) < (p.iconOnly ? AA_ICON : AA_TEXT)
        )
        .map(
          (p) =>
            `${p.label} ${p.text} on ${p.background} = ${contrast(
              p.text,
              p.background
            ).toFixed(2)}`
        );
      if (SHOTS) {
        mkdirSync(SHOTS, { recursive: true });
        await page.screenshot({ path: join(SHOTS, `${screen}-${theme}.png`) });
      }
      await context.close();
    }

    expect(painted.light.htmlIsLight).toBe(true);
    expect(painted.dark.htmlIsLight).toBe(false);
    expect(painted.light.canvasIsLight).toBe(true);
    expect(painted.dark.canvasIsLight).toBe(false);
    expect(
      painted.dark.background,
      "the editor paints the same background in light and dark"
    ).not.toBe(painted.light.background);
    expect(
      painted.dark.text,
      "the editor writes in the same colour in light and dark"
    ).not.toBe(painted.light.text);
    expect(
      weak,
      "controls under WCAG AA (4.5:1 for text, 3:1 for an icon)"
    ).toEqual({ light: [], dark: [] });
  });
}
