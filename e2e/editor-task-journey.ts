import type { Page } from "@playwright/test";
import {
  ADD_CITATION,
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

/* `removedFrom`: how many blocks the page had before the remove task, so the undo task can prove the block came back. */
type Journey = {
  page: Page;
  modality: Modality;
  memo: { removedFrom?: number };
};
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

/* The « Add » button of the row: no drag, one gesture. On a phone the block list may be behind its tab. */
const addButton = (page: Page) =>
  page.getByRole("button", { name: ADD_CITATION }).first();

async function addByPointer({ page }: Journey): Promise<TaskMeasure> {
  const before = await blockCount(page);
  let actions = 0;
  if (!(await addButton(page).isVisible())) {
    await page.getByRole("button", { name: LABELS.blocksTab }).first().click();
    actions += 1;
  }
  const command = await measureShown(
    page,
    addButton(page),
    "Add Citation (block list)",
    "B"
  );
  await addButton(page).click();
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
  const commands: CommandMeasure[] = [];
  let stops = 0;
  let actions = 0;
  if (!(await addButton(page).isVisible())) {
    const tab = await tabTo(page, LABELS.blocksTab);
    if (tab.stops === null || !tab.focus) return notPossible();
    stops += tab.stops;
    commands.push(toCommand("Blocks tab", "B", tab.focus));
    await pressed(page, "Enter");
    actions += 1;
  }
  const reached = await tabTo(page, ADD_CITATION);
  if (reached.stops === null || !reached.focus) return notPossible();
  commands.push(toCommand("Add Citation (block list)", "B", reached.focus));
  await pressed(page, "Enter");
  actions += 1;
  return (await settled(
    page,
    async () => (await blockCount(page)) === before + 1
  ))
    ? done(actions, stops + reached.stops, commands)
    : notPossible();
}

/* ---- move: the "Citation" block goes up one place, without dragging ---- */

const outlineRows = (page: Page) =>
  page.locator(".kz-builder-editor [data-puck-layer-row]");
const citationRow = (page: Page) =>
  outlineRows(page)
    .filter({ hasText: /Citation|Quote/ })
    .first();
const moveUpButton = (page: Page) =>
  page
    .frameLocator(".kz-builder-editor iframe")
    .first()
    .getByRole("button", { name: LABELS.moveUp });

async function movedUp(page: Page, before: string[]): Promise<boolean> {
  return settled(page, async () => {
    const now = await blockTexts(page);
    return now.length === before.length && now.join() !== before.join();
  });
}

async function moveByPointer({ page }: Journey): Promise<TaskMeasure> {
  const before = await blockTexts(page);
  let actions = 0;
  const citation = previewBlocks(page).filter({ hasText: /Citation|Quote/ });
  if (!(await isReachable(citation.first()))) {
    /* On a phone the open panel covers the page: its own tab closes it. */
    await page
      .getByRole("button", { name: await openPanelTab(page) })
      .first()
      .click();
    actions += 1;
    await page.waitForTimeout(400);
  }
  await citation.first().click({ position: { x: 20, y: 4 } });
  actions += 1;
  await page.mouse.move(2, 2); // only the selected block keeps its bar
  await page.waitForTimeout(400);
  const command = await measureShown(
    page,
    moveUpButton(page),
    "Move up (block bar)",
    "B"
  );
  await moveUpButton(page).click();
  actions += 1;
  return (await movedUp(page, before))
    ? done(actions, 0, [command])
    : notPossible();
}

async function moveByKeyboard({ page }: Journey): Promise<TaskMeasure> {
  const before = await blockTexts(page);
  await resetTabOrigin(page);
  const tab = await tabTo(page, LABELS.outlineTab);
  if (tab.stops === null || !tab.focus) return notPossible();
  await pressed(page, "Enter");
  const row = await tabTo(page, /Citation|Quote/, "BUTTON");
  if (row.stops === null || !row.focus) return notPossible();
  await pressed(page, "Alt+ArrowUp");
  const commands = [
    toCommand("Outline tab", "B", tab.focus),
    toCommand("Citation (outline row, Alt+Up)", "B", row.focus),
  ];
  return (await movedUp(page, before))
    ? done(2, tab.stops + row.stops, commands)
    : notPossible();
}

/* ---- remove: the selected block is deleted ---- */

async function removeByPointer({ page, memo }: Journey): Promise<TaskMeasure> {
  const before = await blockCount(page);
  memo.removedFrom = before;
  /* The last block: the bar of the block selected by the move task covers the one above it, never the one below. */
  await previewBlocks(page)
    .last()
    .click({ position: { x: 20, y: 4 } });
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

async function removeByKeyboard({ page, memo }: Journey): Promise<TaskMeasure> {
  const before = await blockCount(page);
  memo.removedFrom = before;
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

/* The tab of the panel that is open: the block list has an Add button on every row, the outline has none. */
async function openPanelTab(page: Page): Promise<RegExp> {
  return (await addButton(page).isVisible())
    ? LABELS.blocksTab
    : LABELS.outlineTab;
}

/* ---- undo: the last change comes back; on a phone the button sits behind the header menu ---- */

/* The proof that Undo did its job: the block the remove task deleted is back (the page has as many blocks as before). */
const undoApplied = async (
  page: Page,
  memo: Journey["memo"]
): Promise<boolean> => (await blockCount(page)) === memo.removedFrom;

async function undoByPointer({ page, memo }: Journey): Promise<TaskMeasure> {
  const editor = page.locator(".kz-builder-editor");
  const undo = editor.getByRole("button", { name: LABELS.undo });
  const toggle = editor.getByRole("button", { name: LABELS.menuToggle });
  const commands: CommandMeasure[] = [];
  let actions = 0;
  if (!(await isReachable(undo))) {
    if (!(await isReachable(toggle))) {
      /* On a phone an open panel hides the header: the panel's own tab closes it. */
      await page
        .getByRole("button", { name: await openPanelTab(page) })
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
  return (await settled(page, () => undoApplied(page, memo)))
    ? done(actions, 0, commands)
    : notPossible();
}

async function undoByKeyboard({ page, memo }: Journey): Promise<TaskMeasure> {
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
  const ok = await settled(page, () => undoApplied(page, memo));
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
  const journey: Journey = { page, modality, memo: {} };
  const cell = {} as CellMeasure;
  for (const task of TASKS) {
    await scrollEditorIntoPlace(page);
    cell[task] = await steps[task](journey);
  }
  return cell;
}
