import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type CellMeasure, FLOOR_PX, TASKS } from "./editor-task-cost";

/* The reference is the cost the editor has today. A number may go down (the work of #3545 and the next tickets), never
   up. null means "cannot be done", which is worse than any number. */

export const REFERENCE_PATH = join(
  __dirname,
  "editor-task-cost.reference.json"
);

export type Reference = Record<string, CellMeasure>;
export type Screen = "desk" | "phone";

export const floorFor = (screen: Screen): number => FLOOR_PX[screen];

const cost = (n: number | null): number =>
  n === null ? Number.POSITIVE_INFINITY : n;

/** Names of the level A and B commands smaller than the floor of this screen. */
export function belowFloor(cell: CellMeasure, screen: Screen): string[] {
  const names = TASKS.flatMap((task) => cell[task].commands)
    .filter(
      (c) =>
        c.level !== "C" && Math.min(c.widthPx, c.heightPx) < floorFor(screen)
    )
    .map((c) => c.name);
  return [...new Set(names)].sort();
}

/* The content-language switch sits in the editor's header at the top of the page, by design (#3547): the thumb zone is for the bottom bar. */
const HOST_COMMANDS = new Set(["content language"]);

/** T1 (#3546): on a phone every level A and B command of the editor is within the thumb's reach, the lower 40 %. */
export const REACH_FRACTION = 0.6;
export function outOfReach(cell: CellMeasure, screen: Screen): string[] {
  if (screen !== "phone") return [];
  const names = TASKS.flatMap((task) => cell[task].commands)
    .filter(
      (c) =>
        c.level !== "C" &&
        !HOST_COMMANDS.has(c.name) &&
        c.yFrac < REACH_FRACTION
    )
    .map((c) => `${c.name} (${c.yFrac})`);
  return [...new Set(names)].sort();
}

/** What got worse against the reference, as plain sentences. Empty: nothing grew. */
export function regressions(
  now: CellMeasure,
  ref: CellMeasure,
  screen: Screen
): string[] {
  const out: string[] = [];
  for (const task of TASKS) {
    if (cost(now[task].actions) > cost(ref[task].actions))
      out.push(
        `${task}: actions ${String(ref[task].actions)} -> ${String(
          now[task].actions
        )}`
      );
    if (cost(now[task].tabStops) > cost(ref[task].tabStops))
      out.push(
        `${task}: tab stops ${String(ref[task].tabStops)} -> ${String(
          now[task].tabStops
        )}`
      );
  }
  const known = new Set(belowFloor(ref, screen));
  for (const name of belowFloor(now, screen)) {
    if (!known.has(name))
      out.push(
        `"${name}" is under the ${floorFor(screen)} px floor of this screen`
      );
  }
  return out;
}

export const readReference = (): Reference => {
  try {
    return JSON.parse(readFileSync(REFERENCE_PATH, "utf8")) as Reference;
  } catch {
    return {};
  }
};

export const writeReference = (ref: Reference): void => {
  writeFileSync(REFERENCE_PATH, `${JSON.stringify(ref, null, 2)}\n`);
};
