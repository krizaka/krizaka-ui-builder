// What the editor's buttons and keys do to the blocks of the page: add after, move one place, move to a zone, duplicate,
// remove. Each one is a reducer action (the same door as the drag), so undo, history and `onAction` see them alike.
// The same operations on a stored document are in `document/operations.ts` (krizaka-internal#3449).
import type { useAppStoreApi } from "../store";
import type { PrivateAppState } from "../types/Internal";

import { ItemSelector } from "./data/get-item";
import { resolveAndReplaceData } from "./data/resolve-and-replace-data";
import { insertComponent } from "./insert-component";
import { rootDroppableId } from "./root-droppable-id";

type AppStoreApi = ReturnType<typeof useAppStoreApi>;
export type BlockSelector = { zone: string; index: number };

export const BLOCK_MOVES = ["up", "down"] as const;
export type BlockMove = (typeof BLOCK_MOVES)[number];

export type MoveOutcome =
  | { ok: true; position: number; total: number; zone: string }
  | { ok: false; reason: "at-edge" | "missing" };

const contentIdsOf = (state: PrivateAppState, zone: string): string[] =>
  state.indexes.zones[zone]?.contentIds ?? [];

const sameSelector = (a: ItemSelector | null | undefined, b: BlockSelector) =>
  !!a && a.index === b.index && (a.zone ?? rootDroppableId) === b.zone;

/** Keeps the selection on the block that moved, when it was the selected one. */
function followSelection(
  appStore: AppStoreApi,
  from: BlockSelector,
  to: BlockSelector
) {
  const { state, dispatch } = appStore.getState();
  if (!sameSelector(state.ui.itemSelector, from)) return;
  dispatch({
    type: "setUi",
    ui: { itemSelector: to },
    recordHistory: false,
  });
}

async function moveTo(
  appStore: AppStoreApi,
  from: BlockSelector,
  to: BlockSelector
): Promise<void> {
  const { state, dispatch } = appStore.getState();
  const id = contentIdsOf(state, from.zone)[from.index];
  dispatch({
    type: "move",
    sourceIndex: from.index,
    sourceZone: from.zone,
    destinationIndex: to.index,
    destinationZone: to.zone,
  });
  followSelection(appStore, from, to);
  const data = appStore.getState().state.indexes.nodes[id]?.data;
  if (data) await resolveAndReplaceData(data, appStore.getState, "move");
}

/** Moves a block one place up or down in its zone. */
export async function moveBlock(
  appStore: AppStoreApi,
  from: BlockSelector,
  move: BlockMove
): Promise<MoveOutcome> {
  const total = contentIdsOf(appStore.getState().state, from.zone).length;
  if (from.index < 0 || from.index >= total)
    return { ok: false, reason: "missing" };
  const index = move === "up" ? from.index - 1 : from.index + 1;
  if (index < 0 || index >= total) return { ok: false, reason: "at-edge" };
  await moveTo(appStore, from, { zone: from.zone, index });
  return { ok: true, position: index + 1, total, zone: from.zone };
}

/** Moves a block to the end of another zone (the page, or a slot of another block). */
export async function moveBlockToZone(
  appStore: AppStoreApi,
  from: BlockSelector,
  zone: string
): Promise<MoveOutcome> {
  const { state } = appStore.getState();
  if (!contentIdsOf(state, from.zone)[from.index])
    return { ok: false, reason: "missing" };
  const inZone = contentIdsOf(state, zone).length;
  const index = zone === from.zone ? inZone - 1 : inZone;
  await moveTo(appStore, from, { zone, index });
  return { ok: true, position: index + 1, total: index + 1, zone };
}

export function removeBlock(appStore: AppStoreApi, at: BlockSelector): void {
  appStore
    .getState()
    .dispatch({ type: "remove", index: at.index, zone: at.zone });
}

export function duplicateBlock(appStore: AppStoreApi, at: BlockSelector): void {
  appStore.getState().dispatch({
    type: "duplicate",
    sourceIndex: at.index,
    sourceZone: at.zone,
  });
}

/** The place a new block takes: after the selected block, else at the end of the page. */
export function nextInsertSpot(state: PrivateAppState): BlockSelector {
  const selected = state.ui.itemSelector;
  if (selected) {
    return {
      zone: selected.zone ?? rootDroppableId,
      index: selected.index + 1,
    };
  }
  return {
    zone: rootDroppableId,
    index: contentIdsOf(state, rootDroppableId).length,
  };
}

/** Adds a block of `type` at `spot` and selects it. */
export function addBlock(
  appStore: AppStoreApi,
  type: string,
  spot: BlockSelector = nextInsertSpot(appStore.getState().state)
): Promise<void> {
  return insertComponent(type, spot.zone, spot.index, appStore);
}

export type MoveDestination = { zone: string; label: string };

/** The zones a block can be moved to: every zone except the ones inside the block itself. */
export function moveDestinations(
  state: PrivateAppState,
  at: BlockSelector,
  labelOf: (zone: string) => string
): MoveDestination[] {
  const id = contentIdsOf(state, at.zone)[at.index];
  return Object.keys(state.indexes.zones)
    .filter((zone) => {
      const owner = zone.split(":")[0];
      if (owner === id) return false;
      const path = state.indexes.nodes[owner]?.path ?? [];
      return !path.some((p) => p.split(":")[0] === id);
    })
    .map((zone) => ({ zone, label: labelOf(zone) }));
}
