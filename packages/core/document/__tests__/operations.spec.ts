/** @jest-environment node */
import {
  duplicateBlock,
  moveBlock,
  removeBlock,
  type Block,
  type ComposerDocument,
  type OperationResult,
} from "../index";

const block = (
  id: string,
  slots: Record<string, readonly Block[]> = {}
): Block => ({ id, type: "text", props: {}, slots });
const doc = (blocks: readonly Block[]): ComposerDocument => ({
  schema: 2,
  locales: ["en"],
  defaultLocale: "en",
  root: { props: {} },
  blocks,
});
const ids = (r: OperationResult): string[] => {
  if (!r.ok) throw new Error(`refused: ${r.error}`);
  return r.document.blocks.map((b) => b.id);
};
const start = doc([block("a"), block("b"), block("c")]);

describe("removeBlock", () => {
  it("removes a top-level block", () => {
    expect(ids(removeBlock(start, "b"))).toEqual(["a", "c"]);
  });

  it("removes a nested block and leaves the original document untouched", () => {
    const nested = doc([block("p", { items: [block("x"), block("y")] })]);
    const r = removeBlock(nested, "x");
    expect(r.ok && r.document.blocks[0].slots.items.map((b) => b.id)).toEqual([
      "y",
    ]);
    expect(nested.blocks[0].slots.items).toHaveLength(2);
  });

  it("refuses an unknown id with a typed code", () => {
    expect(removeBlock(start, "zz")).toEqual({
      ok: false,
      error: "block_not_found",
    });
  });
});

describe("moveBlock", () => {
  it("moves a block down and up", () => {
    expect(ids(moveBlock(start, "a", "down"))).toEqual(["b", "a", "c"]);
    expect(ids(moveBlock(start, "c", "up"))).toEqual(["a", "c", "b"]);
  });

  it("moves inside a slot only", () => {
    const nested = doc([
      block("p", { items: [block("x"), block("y")] }),
      block("q"),
    ]);
    const r = moveBlock(nested, "x", "down");
    expect(r.ok && r.document.blocks[0].slots.items.map((b) => b.id)).toEqual([
      "y",
      "x",
    ]);
    expect(r.ok && r.document.blocks.map((b) => b.id)).toEqual(["p", "q"]);
  });

  it("refuses at the edge and for an unknown id", () => {
    expect(moveBlock(start, "a", "up")).toEqual({
      ok: false,
      error: "at_edge",
    });
    expect(moveBlock(start, "c", "down")).toEqual({
      ok: false,
      error: "at_edge",
    });
    expect(moveBlock(start, "zz", "up")).toEqual({
      ok: false,
      error: "block_not_found",
    });
  });
});

describe("duplicateBlock", () => {
  it("inserts the copy right after the source with the given id", () => {
    expect(ids(duplicateBlock(start, "a", (b) => `${b.id}-copy`))).toEqual([
      "a",
      "a-copy",
      "b",
      "c",
    ]);
  });

  it("gives every nested block of the copy a new id", () => {
    const nested = doc([block("p", { items: [block("x")] })]);
    const r = duplicateBlock(nested, "p", (b) => `${b.id}2`);
    expect(r.ok && r.document.blocks[1].slots.items[0].id).toBe("x2");
  });

  it("refuses an id the document already uses", () => {
    expect(duplicateBlock(start, "a", () => "b")).toEqual({
      ok: false,
      error: "id_in_use",
    });
  });

  it("refuses an unknown id", () => {
    expect(duplicateBlock(start, "zz", () => "n")).toEqual({
      ok: false,
      error: "block_not_found",
    });
  });
});
