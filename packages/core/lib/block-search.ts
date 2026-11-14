/** A search over the block list shows up from this many blocks: fewer, and scanning the list is faster than typing. */
// @fixed: an ergonomic threshold of the editor (krizaka-internal#3545), not a business setting.
export const BLOCK_SEARCH_FROM = 8;

const fold = (text: string): string =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Whether a block label matches what was typed: any case, accents ignored, every word present. */
export const matchesBlockSearch = (label: string, query: string): boolean => {
  const words = fold(query).split(/\s+/).filter(Boolean);
  const target = fold(label);

  return words.every((w) => target.includes(w));
};
