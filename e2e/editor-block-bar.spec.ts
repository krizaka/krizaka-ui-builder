import { expect, test } from "@playwright/test";
import { openEditor } from "./editor-task-cost";
import {
  THEMES,
  contrast,
  focusRings,
  selectFirstBlock,
  visibleBlockBars,
} from "./editor-theme";

/* The selected block has one bar: on a phone the floating one at the thumb (the one inside the preview is hidden), on a
   desktop the one inside the preview. The focus ring of every bar shows at 3:1 on its surface, in both themes (WCAG 1.4.11). */

const BUILDER_PATH = process.env.BUILDER_PATH ?? "/fr/builder";
const NON_TEXT_AA = 3;

test("a selected block has one bar on a phone", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 780 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await openEditor(page, BUILDER_PATH);
  await selectFirstBlock(page);
  expect(await visibleBlockBars(page)).toEqual({ inCanvas: 0, floating: 1 });
  await context.close();
});

test("a selected block has one bar on a desktop", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await openEditor(page, BUILDER_PATH);
  await selectFirstBlock(page);
  expect(await visibleBlockBars(page)).toEqual({ inCanvas: 1, floating: 0 });
  await context.close();
});

for (const [name, viewport, hasTouch] of [
  ["phone", { width: 360, height: 780 }, true],
  ["desk", { width: 1440, height: 900 }, false],
] as const) {
  for (const theme of THEMES) {
    test(`the focus ring of the block bar shows, ${name} ${theme}`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        viewport,
        colorScheme: theme,
        hasTouch,
      });
      const page = await context.newPage();
      await openEditor(page, BUILDER_PATH);
      await selectFirstBlock(page);
      const rings = await focusRings(page);
      expect(rings.length).toBeGreaterThan(0);
      const weak = rings
        .filter(
          (r) => r.ring === "none" || contrast(r.ring, r.surface) < NON_TEXT_AA
        )
        .map((r) => `${r.label}: ${r.ring} on ${r.surface}`);
      expect(weak, "focus rings under 3:1").toEqual([]);
      await context.close();
    });
  }
}
