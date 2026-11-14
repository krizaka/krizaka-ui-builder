import { BLOCK_SEARCH_FROM, matchesBlockSearch } from "../block-search";

describe("matchesBlockSearch", () => {
  it("ignores case and accents", () => {
    expect(matchesBlockSearch("Séparateur", "separ")).toBe(true);
    expect(matchesBlockSearch("Citation", "CITA")).toBe(true);
  });

  it("needs every word, in any order", () => {
    expect(matchesBlockSearch("Pied de page", "page pied")).toBe(true);
    expect(matchesBlockSearch("Pied de page", "pied carte")).toBe(false);
  });

  it("matches everything for an empty search", () => {
    expect(matchesBlockSearch("Titre", "  ")).toBe(true);
  });

  it("shows the search from 8 blocks", () => {
    expect(BLOCK_SEARCH_FROM).toBe(8);
  });
});
