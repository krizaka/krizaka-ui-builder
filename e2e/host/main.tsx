import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Puck,
  blocksPlugin,
  dictionaryEn,
  dictionaryFr,
  outlinePlugin,
  type Config,
  type Data,
} from "@krizaka/ui-builder";

/* The page that hosts the editor for the editor-cost journey: the branch's own build, a French/English page, nine
   blocks (so the block search shows up) and the editor's own content-language switch (#3547). It stands for the host site of the live demo. */

type TextProps = { text: string };
const BLOCKS: Record<string, [string, (p: TextProps) => JSX.Element]> = {
  Heading: ["Titre", (p) => <h2>{p.text}</h2>],
  Paragraph: ["Paragraphe", (p) => <p>{p.text}</p>],
  Citation: ["Citation", (p) => <blockquote>{p.text}</blockquote>],
  Image: ["Image", (p) => <figure>{p.text}</figure>],
  Button: ["Bouton", (p) => <a href="#top">{p.text}</a>],
  List: [
    "Liste",
    (p) => (
      <ul>
        <li>{p.text}</li>
      </ul>
    ),
  ],
  Divider: ["Séparateur", (p) => <hr aria-label={p.text} />],
  Card: ["Carte", (p) => <article>{p.text}</article>],
  Footer: ["Pied de page", (p) => <footer>{p.text}</footer>],
};

const config: Config = {
  components: Object.fromEntries(
    Object.entries(BLOCKS).map(([name, [label, render]]) => [
      name,
      {
        label,
        fields: { text: { type: "text" } },
        defaultProps: { text: label },
        render,
      },
    ])
  ),
};

const item = (type: string, id: number, text: string) => ({
  type,
  props: { id: `${type}-${id}`, text },
});
const initial: Data = {
  root: { props: {} },
  content: [
    item("Heading", 1, "Bienvenue chez nous"),
    item("Paragraph", 2, "Un premier paragraphe"),
    item("Citation", 3, "Une citation à déplacer"),
    item("Paragraph", 4, "Un second paragraphe"),
  ],
};

type Language = "fr" | "en";

const LANGUAGES = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
];

const Host = () => {
  const [language, setLanguage] = useState<Language>("fr");

  return (
    <div className="kz-builder-editor" style={{ height: "100dvh" }}>
      <Puck
        config={config}
        height="100%"
        data={initial}
        dictionary={language === "fr" ? dictionaryFr : dictionaryEn}
        contentLanguage={{
          value: language,
          options: LANGUAGES,
          onChange: (value) => setLanguage(value as Language),
        }}
        plugins={[
          blocksPlugin({ label: language === "fr" ? "Blocs" : "Blocks" }),
          outlinePlugin({ label: language === "fr" ? "Plan" : "Outline" }),
        ]}
      />
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<Host />);
