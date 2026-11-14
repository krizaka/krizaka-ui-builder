import { expect, test } from "@playwright/test";
import { MODALITIES } from "./editor-task-cost";
import { playJourney } from "./editor-task-journey";
import {
  type Reference,
  type Screen,
  belowFloor,
  outOfReach,
  readReference,
  regressions,
  writeReference,
} from "./editor-task-reference";
import { openEditor } from "./editor-task-cost";

/* One journey, four cells: a desk (1440 x 900) and a phone (360 x 780), each with the pointer and with the keyboard.
   Each cell plays add, move, remove, undo, change language and compares the cost with editor-task-cost.reference.json.
   UPDATE_REFERENCE=1 rewrites the reference (to record a lower cost; a higher one is a regression, not an update). */

const SCREENS: Record<Screen, { width: number; height: number }> = {
  desk: { width: 1440, height: 900 },
  phone: { width: 360, height: 780 },
};
const BUILDER_PATH = process.env.BUILDER_PATH ?? "/fr/builder";
const measured: Reference = {};

for (const screen of Object.keys(SCREENS) as Screen[]) {
  for (const modality of MODALITIES) {
    const key = `${screen}/${modality}`;
    test(`editor task cost, ${key}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: SCREENS[screen],
        hasTouch: screen === "phone" && modality === "pointer",
      });
      const page = await context.newPage();
      await openEditor(page, BUILDER_PATH);

      const cell = await playJourney(page, modality);
      measured[key] = cell;
      console.log(`COST ${key} ${JSON.stringify(cell)}`);
      console.log(
        `OUT-OF-REACH ${key} ${JSON.stringify(outOfReach(cell, screen))}`
      );
      console.log(
        `BELOW-FLOOR ${key} ${JSON.stringify(belowFloor(cell, screen))}`
      );
      await context.close();

      if (process.env.UPDATE_REFERENCE) {
        writeReference({ ...readReference(), [key]: cell });
        return;
      }
      expect(
        outOfReach(cell, screen),
        `level A or B commands above 60 % of the screen height on ${key}`
      ).toEqual([]);
      const ref = readReference()[key];
      expect(
        ref,
        `no reference for ${key}: run with UPDATE_REFERENCE=1`
      ).toBeDefined();
      expect(
        regressions(cell, ref, screen),
        `the cost of an editor task grew on ${key}`
      ).toEqual([]);
    });
  }
}
