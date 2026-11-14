import { useState } from "react";

import { BLOCK_SEARCH_FROM, matchesBlockSearch } from "../../lib/block-search";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { useMessage } from "../../lib/use-message";
import { useAppStore } from "../../store";

import { BlockSearch } from "../BlockSearch";

import styles from "./styles.module.css";

const getClassName = getClassNameFactory("BlockPicker", styles);

/** The « + » of the block bar: the blocks one can add after the selected block, as buttons (no drag). */
export const BlockPicker = ({
  onPick,
  onClose,
}: {
  onPick: (type: string) => void;
  onClose: () => void;
}) => {
  const components = useAppStore((s) => s.config.components);
  const permissions = useAppStore((s) => s.permissions);
  const [query, setQuery] = useState("");
  const title = useMessage("action-addafter");
  const empty = useMessage("drawer-search-empty");
  const names = Object.keys(components).filter(
    (name) => permissions.getPermissions({ type: name }).insert
  );
  const label = (name: string) => String(components[name].label ?? name);
  const shown = names.filter((name) => matchesBlockSearch(label(name), query));

  return (
    <div
      className={getClassName()}
      role="dialog"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      {names.length >= BLOCK_SEARCH_FROM && (
        <BlockSearch value={query} onChange={setQuery} />
      )}
      <ul className={getClassName("list")}>
        {shown.map((name) => (
          <li key={name}>
            <button
              type="button"
              className={getClassName("item")}
              onClick={() => onPick(name)}
            >
              {label(name)}
            </button>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p role="status">{empty}</p>}
    </div>
  );
};
