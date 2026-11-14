import { expect, test } from "@playwright/test";
import { EDITOR, openEditor } from "./editor-task-cost";

/* The layout of the editor on a real page (#3548): the side panels are 256 px, the blocks panel opens folded under
   1280 px, and a page hosted full width at 1440 x 900 leaves the preview 720 px or more with both panels open.
   SCREENSHOT_DIR=<folder> also writes the renders (light and dark) the status file shows. */

const BUILDER_PATH = process.env.BUILDER_PATH ?? "/fr/builder";
const PANEL_PX = 256;
const MIN_PREVIEW_PX = 720;
const SIDEBAR = (side: "left" | "right") =>
  `${EDITOR} [class*="Sidebar--${side}"]`;
const PREVIEW = `${EDITOR} #puck-canvas-root`;
const SCREENS = [
  { name: "phone", width: 360, height: 780 },
  { name: "1279", width: 1279, height: 900 },
  { name: "1280", width: 1280, height: 900 },
  { name: "1440", width: 1440, height: 900 },
] as const;

const widthOf = async (
  page: import("@playwright/test").Page,
  selector: string
) =>
  page
    .locator(selector)
    .first()
    .evaluate((e) => e.getBoundingClientRect().width);

test("at 1440 x 900 both panels are 256 px and the preview keeps 720 px or more", async ({
  browser,
}) => {
  const page = await (
    await browser.newContext({ viewport: { width: 1440, height: 900 } })
  ).newPage();
  await openEditor(page, BUILDER_PATH);

  expect(await widthOf(page, SIDEBAR("left"))).toBeCloseTo(PANEL_PX, 0);
  expect(await widthOf(page, SIDEBAR("right"))).toBeCloseTo(PANEL_PX, 0);
  expect(await widthOf(page, PREVIEW)).toBeGreaterThanOrEqual(MIN_PREVIEW_PX);
});

test("under 1280 px the blocks panel opens folded as a rail; from 1280 px it is open", async ({
  browser,
}) => {
  const folded = await (
    await browser.newContext({ viewport: { width: 1279, height: 900 } })
  ).newPage();
  await openEditor(folded, BUILDER_PATH);
  await expect(folded.locator(SIDEBAR("left"))).toBeHidden();
  await expect(
    folded.getByRole("button", { name: /^(blocs|blocks)$/i })
  ).toBeVisible();

  const open = await (
    await browser.newContext({ viewport: { width: 1280, height: 900 } })
  ).newPage();
  await openEditor(open, BUILDER_PATH);
  await expect(open.locator(SIDEBAR("left"))).toBeVisible();
});

test("an empty fields panel says what to do", async ({ browser }) => {
  const page = await (
    await browser.newContext({ viewport: { width: 1440, height: 900 } })
  ).newPage();
  await openEditor(page, BUILDER_PATH);

  await expect(
    page
      .locator(SIDEBAR("right"))
      .getByText(/^(Choisissez un bloc à modifier|Choose a block to edit)$/)
  ).toBeVisible();
});

test("the panels stay resizable", async ({ browser }) => {
  const page = await (
    await browser.newContext({ viewport: { width: 1440, height: 900 } })
  ).newPage();
  await openEditor(page, BUILDER_PATH);
  const box = (await page.locator(SIDEBAR("left")).boundingBox())!;

  await page.mouse.move(box.x + box.width, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 60, box.y + 200);
  await page.mouse.up();

  expect(await widthOf(page, SIDEBAR("left"))).toBeGreaterThan(PANEL_PX + 40);
});

const DIR = process.env.SCREENSHOT_DIR;
for (const scheme of ["light", "dark"] as const) {
  for (const screen of SCREENS) {
    test(`render ${screen.name} ${scheme}`, async ({ browser }) => {
      test.skip(!DIR, "set SCREENSHOT_DIR to write the renders");
      const context = await browser.newContext({
        viewport: { width: screen.width, height: screen.height },
        colorScheme: scheme,
      });
      const page = await context.newPage();
      await openEditor(page, BUILDER_PATH);
      await page.screenshot({ path: `${DIR}/${screen.name}-${scheme}.png` });
      await context.close();
    });
  }
}
