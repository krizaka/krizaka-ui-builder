import type { Page } from "@playwright/test";
import {
  type CellMeasure,
  type CommandMeasure,
  type Modality,
  type TaskMeasure,
  TASKS,
  LABELS,
  blockCount,
  blockTexts,
  drag,
  drawerItem,
  isReachable,
  measureShown,
  previewBlocks,
  scrollEditorIntoPlace,
  resetTabOrigin,
  tabTo,
  toCommand,
} from "./editor-task-cost";

/* The five editor tasks, played one after the other on one page: add a block, move it, remove one, undo, change the
   content language. Each task returns what it cost. A step that cannot be done reports null instead of throwing, so
   a missing keyboard path is a number in the reference, not a crash. */

type Journey = { page: Page; modality: Modality };
const done = (
  actions: number | null,
  tabStops: number | null,
  commands: CommandMeasure[]
): TaskMeasure => ({
  actions,
  tabStops,
  commands,
});
const notPossible = (): TaskMeasure => done(null, null, []);
const pressed = async (page: Page, key: string): Promise<void> => {
  await page.keyboard.press(key);
  await page.waitForTimeout(500);
};

async function settled(
  page: Page,
  ok: () => Promise<boolean>
): Promise<boolean> {
  for (let i = 0; i < 10; i += 1) {
    if (await ok()) return true;
    await page.waitForTimeout(300);
  }
  return false;
}

/* ---- add: a "Citation" block from the block list into the page ---- */

async function addByPointer({ page }: Journey): Promise<TaskMeasure> {
  const before = await blockCount(page);
  let actions = 0;
  const item = drawerItem(page, "Citation");
  if (!(await item.isVisible())) {
    await page.getByRole("button", { name: LABELS.blocksTab }).first().click();
    actions += 1;
  }
  const command = await measureShown(page, item, "Citation (block list)", "B");
  await drag(page, item, previewBlocks(page).nth(1), 40);
  actions += 1;
  return (await settled(
    page,
    async () => (await blockCount(page)) === before + 1
  ))
    ? done(actions, 0, [command])
    : notPossible();
}

async function addByKeyboard({ page }: Journey): Promise<TaskMeasure> {
  const before = await blockCount(page);
  await resetTabOrigin(page);
  const { stops, focus } = await tabTo(page, /^Citation$/);
  if (stops === null || !focus) return notPossible();
  await pressed(page, "Enter");
  if (
    !(await settled(page, async () => (await blockCount(page)) === before + 1))
  )
    return done(null, null, []);
  return done(1, stops, [toCommand("Citation (block list)", "B", focus)]);
}

/* ---- move: a "Citation" row of the outline goes to the top of the page (the preview itself cannot be dragged) ---- */

const outlineRows = (page: Page) =>
  page.locator(".kz-builder-editor [class*=Layer-inner]");
const citationRow = (page: Page) =>
  outlineRows(page)
    .filter({ hasText: /Citation|Quote/ })
    .first();

async function moveByPointer({ page }: Journey): Promise<TaskMeasure> {
  const first = (await blockTexts(page))[0];
  let actions = 0;
  const plan = page.getByRole("button", { name: LABELS.outlineTab }).first();
  const commands: CommandMeasure[] = [];
  if (!(await citationRow(page).isVisible())) {
    commands.push(await measureShown(page, plan, "Outline tab", "B"));
    await plan.click();
    actions += 1;
  }
  commands.push(
    await measureShown(
      page,
      citationRow(page),
      "Citation (outline row, drag only)",
      "B"
    )
  );
  await drag(page, citationRow(page), outlineRows(page).first(), -10);
  actions += 1;
  return (await settled(
    page,
    async () => (await blockTexts(page))[0] !== first
  ))
    ? done(actions, 0, commands)
    : notPossible();
}

async function moveByKeyboard({ page }: Journey): Promise<TaskMeasure> {
  const first = (await blockTexts(page))[0];
  await resetTabOrigin(page);
  const tab = await tabTo(page, LABELS.outlineTab);
  if (tab.stops === null || !tab.focus) return notPossible();
  await pressed(page, "Enter");
  const row = await tabTo(page, /Citation|Quote/, "BUTTON");
  if (row.stops === null || !row.focus) return notPossible();
  for (const key of ["Space", "ArrowUp", "ArrowUp", "ArrowUp", "Space"])
    await pressed(page, key);
  const moved = await settled(
    page,
    async () => (await blockTexts(page))[0] !== first
  );
  const commands = [
    toCommand("Outline tab", "B", tab.focus),
    toCommand("Citation (outline row)", "B", row.focus),
  ];
  return moved ? done(6, tab.stops + row.stops, commands) : notPossible();
}

/* ---- remove: the selected block is deleted ---- */

async function removeByPointer({ page }: Journey): Promise<TaskMeasure> {
  const before = await blockCount(page);
  await previewBlocks(page)
    .nth(1)
    .click({ position: { x: 20, y: 20 } });
  await page.mouse.move(2, 2); // drop the hover bar: only the selected block keeps its bar
  await page.waitForTimeout(400);
  const button = page
    .frameLocator(".kz-builder-editor iframe")
    .first()
    .getByRole("button", { name: LABELS.remove });
  const command = await measureShown(page, button, "Delete (block bar)", "C");
  await button.click();
  return (await settled(
    page,
    async () => (await blockCount(page)) === before - 1
  ))
    ? done(2, 0, [command])
    : notPossible();
}

async function removeByKeyboard({ page }: Journey): Promise<TaskMeasure> {
  const before = await blockCount(page);
  await resetTabOrigin(page);
  const { stops, focus } = await tabTo(page, LABELS.remove);
  if (stops === null || !focus) return notPossible();
  await pressed(page, "Enter");
  if (
    !(await settled(page, async () => (await blockCount(page)) === before - 1))
  )
    return notPossible();
  return done(1, stops, [toCommand("Delete (block bar)", "C", focus)]);
}

/* ---- undo: the last change comes back; on a phone the button sits behind the header menu ---- */

/* Puck enables Redo once an undo has been applied: the proof that the button did its job. */
const undoApplied = async (page: Page): Promise<boolean> =>
  page
    .locator(".kz-builder-editor")
    .getByRole("button", { name: LABELS.redo })
    .isEnabled();

async function undoByPointer({ page }: Journey): Promise<TaskMeasure> {
  const editor = page.locator(".kz-builder-editor");
  const undo = editor.getByRole("button", { name: LABELS.undo });
  const toggle = editor.getByRole("button", { name: LABELS.menuToggle });
  const commands: CommandMeasure[] = [];
  let actions = 0;
  if (!(await isReachable(undo))) {
    if (!(await isReachable(toggle))) {
      /* On a phone an open panel hides the header: the panel's own tab closes it. */
      await page
        .getByRole("button", { name: LABELS.outlineTab })
        .first()
        .click();
      actions += 1;
    }
    commands.push(await measureShown(page, toggle, "menu bar toggle", "B"));
    await toggle.click();
    actions += 1;
  }
  commands.push(await measureShown(page, undo, "Undo", "B"));
  await undo.click();
  actions += 1;
  return (await settled(page, () => undoApplied(page)))
    ? done(actions, 0, commands)
    : notPossible();
}

async function undoByKeyboard({ page }: Journey): Promise<TaskMeasure> {
  await resetTabOrigin(page);
  const commands: CommandMeasure[] = [];
  let stops = 0;
  let actions = 0;
  const toggle = page
    .locator(".kz-builder-editor")
    .getByRole("button", { name: LABELS.menuToggle });
  if (
    !(await page
      .locator(".kz-builder-editor")
      .getByRole("button", { name: LABELS.undo })
      .isVisible())
  ) {
    const reached = await tabTo(page, LABELS.menuToggle);
    if (reached.stops === null || !reached.focus || !(await toggle.count()))
      return notPossible();
    stops += reached.stops;
    commands.push(toCommand("menu bar toggle", "B", reached.focus));
    await pressed(page, "Enter");
    actions += 1;
  }
  const reached = await tabTo(page, LABELS.undo);
  if (reached.stops === null || !reached.focus) return notPossible();
  commands.push(toCommand("Undo", "B", reached.focus));
  await pressed(page, "Enter");
  actions += 1;
  const ok = await settled(page, () => undoApplied(page));
  return ok ? done(actions, stops + reached.stops, commands) : notPossible();
}

/* ---- language: the content language switches to English (the active language button turns primary) ---- */

const languageButton = (page: Page) =>
  page.getByRole("button", { name: LABELS.contentLanguage }).first();
const languageIsEnglish = async (page: Page): Promise<boolean> =>
  (await languageButton(page).getAttribute("data-variant")) === "primary";

async function languageByPointer({ page }: Journey): Promise<TaskMeasure> {
  const command = await measureShown(
    page,
    languageButton(page),
    "content language",
    "A"
  );
  await languageButton(page).click();
  return (await settled(page, () => languageIsEnglish(page)))
    ? done(1, 0, [command])
    : notPossible();
}

async function languageByKeyboard({ page }: Journey): Promise<TaskMeasure> {
  await resetTabOrigin(page);
  const { stops, focus } = await tabTo(page, LABELS.contentLanguage);
  if (stops === null || !focus) return notPossible();
  await pressed(page, "Enter");
  if (!(await settled(page, () => languageIsEnglish(page))))
    return notPossible();
  return done(1, stops, [toCommand("content language", "A", focus)]);
}

const STEPS = {
  pointer: {
    add: addByPointer,
    move: moveByPointer,
    remove: removeByPointer,
    undo: undoByPointer,
    language: languageByPointer,
  },
  keyboard: {
    add: addByKeyboard,
    move: moveByKeyboard,
    remove: removeByKeyboard,
    undo: undoByKeyboard,
    language: languageByKeyboard,
  },
} as const;

export async function playJourney(
  page: Page,
  modality: Modality
): Promise<CellMeasure> {
  const steps = STEPS[modality];
  const journey = { page, modality };
  const cell = {} as CellMeasure;
  for (const task of TASKS) {
    await scrollEditorIntoPlace(page);
    cell[task] = await steps[task](journey);
  }
  return cell;
}
