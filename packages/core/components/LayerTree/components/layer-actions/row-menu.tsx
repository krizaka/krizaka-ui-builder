import { ArrowDown, ArrowUp, MoreHorizontal } from "lucide-react";
import { useId, useState } from "react";

import getClassNameFactory from "../../../../lib/get-class-name-factory";
import { useMessage } from "../../../../lib/use-message";
import { IconButton } from "../../../IconButton";

import { focusLayerRow, useLayerMove } from "../../lib/use-layer-move";
import type { LayerNode } from "../../types";

import styles from "./styles.module.css";

const getClassName = getClassNameFactory("LayerActions", styles);

/**
 * The row menu: Move up, Move down, Move to… for a person who does not drag. A disclosure (a button that shows a few
 * buttons and a select), not an ARIA menu, so Tab and the native select keep working.
 */
export const RowMenu = ({ node }: { node: LayerNode }) => {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const { move, moveToZone, destinations } = useLayerMove(node);
  const menuLabel = useMessage("outline-item-menu", { label: node.label });
  const upLabel = useMessage("outline-item-moveup");
  const downLabel = useMessage("outline-item-movedown");
  const toLabel = useMessage("outline-item-moveto");

  const close = () => {
    setOpen(false);
    focusLayerRow(node.itemId);
  };

  return (
    <>
      <IconButton
        type="button"
        title={menuLabel}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <MoreHorizontal />
      </IconButton>
      {open && (
        <div
          id={menuId}
          className={getClassName("menu")}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            e.stopPropagation();
            close();
          }}
        >
          <button
            type="button"
            className={getClassName("menuItem")}
            disabled={node.index === 0}
            onClick={() => void move("up").then(() => setOpen(false))}
          >
            <ArrowUp /> {upLabel}
          </button>
          <button
            type="button"
            className={getClassName("menuItem")}
            onClick={() => void move("down").then(() => setOpen(false))}
          >
            <ArrowDown /> {downLabel}
          </button>
          <select
            className={getClassName("menuSelect")}
            aria-label={toLabel}
            value=""
            onChange={(e) => {
              const zone = e.target.value;
              const zoneLabel = e.target.selectedOptions[0]?.text ?? zone;
              void moveToZone(zone, zoneLabel).then(() => setOpen(false));
            }}
          >
            <option value="" disabled>
              {toLabel}
            </option>
            {destinations().map((d) => (
              <option key={d.zone} value={d.zone}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
};
