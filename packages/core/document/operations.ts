// The typed operations on a document's blocks (krizaka-internal#3449): one door for the editor's buttons, the keyboard
// and the assistant. Pure and immutable: a document goes in, a new document or a typed refusal comes out. No clock, no
// random: the id of a duplicate is given by the caller.
import type { Block, ComposerDocument } from "./types";

export const OPERATION_ERRORS = [
  "block_not_found",
  "at_edge",
  "id_in_use",
] as const;
export type OperationError = (typeof OPERATION_ERRORS)[number];

export type OperationResult =
  | { readonly ok: true; readonly document: ComposerDocument }
  | { readonly ok: false; readonly error: OperationError };

export const MOVE_DIRECTIONS = ["up", "down"] as const;
export type MoveDirection = (typeof MOVE_DIRECTIONS)[number];

const refuse = (error: OperationError): OperationResult => ({
  ok: false,
  error,
});

type Located = {
  readonly list: readonly Block[];
  readonly index: number;
  readonly block: Block;
};

/** Rewrites the list that holds `id`, wherever it is nested; undefined when no list holds it. */
function rewriteListOf(
  blocks: readonly Block[],
  id: string,
  rewrite: (located: Located) => readonly Block[]
): readonly Block[] | undefined {
  const index = blocks.findIndex((b) => b.id === id);
  if (index >= 0) return rewrite({ list: blocks, index, block: blocks[index] });
  for (const [at, parent] of blocks.entries()) {
    for (const [slot, children] of Object.entries(parent.slots)) {
      const next = rewriteListOf(children, id, rewrite);
      if (next === undefined) continue;
      const rewritten: Block = {
        ...parent,
        slots: { ...parent.slots, [slot]: next },
      };
      return blocks.map((b, i) => (i === at ? rewritten : b));
    }
  }
  return undefined;
}

const withBlocks = (
  doc: ComposerDocument,
  blocks: readonly Block[]
): OperationResult => ({ ok: true, document: { ...doc, blocks } });

const idsOf = (blocks: readonly Block[]): string[] =>
  blocks.flatMap((b) => [
    b.id,
    ...Object.values(b.slots).flatMap((c) => idsOf(c)),
  ]);

/** Removes a block and everything nested in it. */
export function removeBlock(
  doc: ComposerDocument,
  id: string
): OperationResult {
  const blocks = rewriteListOf(doc.blocks, id, ({ list, index }) =>
    list.filter((_, i) => i !== index)
  );
  return blocks ? withBlocks(doc, blocks) : refuse("block_not_found");
}

/** Moves a block one place up or down in its own list. */
export function moveBlock(
  doc: ComposerDocument,
  id: string,
  direction: MoveDirection
): OperationResult {
  let atEdge = false;
  const blocks = rewriteListOf(doc.blocks, id, ({ list, index }) => {
    const to = direction === "up" ? index - 1 : index + 1;
    if (to < 0 || to >= list.length) {
      atEdge = true;
      return list;
    }
    const next = [...list];
    [next[index], next[to]] = [next[to], next[index]];
    return next;
  });
  if (!blocks) return refuse("block_not_found");
  return atEdge ? refuse("at_edge") : withBlocks(doc, blocks);
}

/** Copies the ids of a block and its descendants with `makeId`, so no id of the copy collides. */
const reidentified = (
  block: Block,
  makeId: (from: Block) => string
): Block => ({
  ...block,
  id: makeId(block),
  slots: Object.fromEntries(
    Object.entries(block.slots).map(([slot, children]) => [
      slot,
      children.map((c) => reidentified(c, makeId)),
    ])
  ),
});

/**
 * Inserts a copy of a block right after it. `makeId` gives the id of the copy and of each block nested in it; an id that
 * the document already uses is refused rather than repaired.
 */
export function duplicateBlock(
  doc: ComposerDocument,
  id: string,
  makeId: (from: Block) => string
): OperationResult {
  const used = new Set(idsOf(doc.blocks));
  let collides = false;
  const blocks = rewriteListOf(doc.blocks, id, ({ list, index, block }) => {
    const copy = reidentified(block, (from) => {
      const fresh = makeId(from);
      if (used.has(fresh)) collides = true;
      used.add(fresh);
      return fresh;
    });
    return [...list.slice(0, index + 1), copy, ...list.slice(index + 1)];
  });
  if (!blocks) return refuse("block_not_found");
  return collides ? refuse("id_in_use") : withBlocks(doc, blocks);
}
