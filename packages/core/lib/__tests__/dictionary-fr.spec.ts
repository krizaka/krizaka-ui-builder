import { defaultDictionary } from "../dictionary";
import { dictionaryFr } from "../dictionary-fr";

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

describe("dictionaryFr", () => {
  it("has exactly the keys of the English dictionary", () => {
    expect(Object.keys(dictionaryFr).sort()).toEqual(
      Object.keys(defaultDictionary).sort()
    );
  });

  it("keeps every {placeholder} of the English text, and no word is left empty", () => {
    for (const [key, english] of Object.entries(defaultDictionary)) {
      const french = dictionaryFr[key as keyof typeof dictionaryFr];
      expect(french.trim()).not.toBe("");
      expect(placeholders(french)).toEqual(placeholders(english));
    }
  });

  it("words the three moves and the add button the same on every screen", () => {
    expect(dictionaryFr["action-moveup"]).toBe("Monter");
    expect(dictionaryFr["action-movedown"]).toBe("Descendre");
    expect(dictionaryFr["action-addafter"]).toBe("Ajouter un bloc après");
    expect(defaultDictionary["action-moveup"]).toBe("Move up");
    expect(defaultDictionary["action-delete"]).toBe("Remove");
  });
});
