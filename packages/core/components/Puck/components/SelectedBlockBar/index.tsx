import { ReactNode, useCallback } from "react";
import { ArrowDown, ArrowUp, Copy, Trash } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { useAppStore, useAppStoreApi } from "../../../../store";
import { getClassNameFactory } from "../../../../lib";
import { getItem } from "../../../../lib/data/get-item";
import { rootDroppableId } from "../../../../lib/root-droppable-id";
import { useMessage } from "../../../../lib/use-message";
import { useRovingToolbar } from "../../../../lib/use-roving-toolbar";
import {
  duplicateBlock,
  moveBlock,
  removeBlock,
} from "../../../../lib/block-actions";

import styles from "./styles.module.css";

const getClassName = getClassNameFactory("SelectedBlockBar", styles);

const BarButton = ({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    className={getClassName("button")}
    title={label}
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </button>
);

/**
 * On a phone (the stylesheet hides it from 638px up) the selected block's frequent actions float above the bottom
 * bar, at the thumb: the bar inside the preview is small and moves with the block.
 */
export const SelectedBlockBar = () => {
  const appStore = useAppStoreApi();
  const selector = useAppStore((s) => s.state.ui.itemSelector);
  const zone = selector?.zone ?? rootDroppableId;
  const zoneSize = useAppStore(
    (s) => s.state.indexes.zones[zone]?.contentIds.length ?? 0
  );
  const permissions = useAppStore(
    useShallow((s) => {
      const item = selector ? getItem(selector, s.state) : undefined;
      return item ? s.permissions.getPermissions({ item }) : null;
    })
  );

  const moveUpLabel = useMessage("action-moveup");
  const moveDownLabel = useMessage("action-movedown");
  const duplicateLabel = useMessage("action-duplicate");
  const deleteLabel = useMessage("action-delete");
  const barProps = useRovingToolbar<HTMLDivElement>({
    label: useMessage("action-bar"),
  });

  const at = selector ? { zone, index: selector.index } : null;
  const act = useCallback(
    (run: (to: { zone: string; index: number }) => unknown) => () => {
      if (at) run(at);
    },
    [at?.zone, at?.index]
  );

  if (!at || !permissions) return null;

  return (
    <div className={getClassName()} {...barProps}>
      {permissions.drag && (
        <>
          <BarButton
            label={moveUpLabel}
            disabled={at.index === 0}
            onClick={act((to) => moveBlock(appStore, to, "up"))}
          >
            <ArrowUp />
          </BarButton>
          <BarButton
            label={moveDownLabel}
            disabled={at.index >= zoneSize - 1}
            onClick={act((to) => moveBlock(appStore, to, "down"))}
          >
            <ArrowDown />
          </BarButton>
        </>
      )}
      {permissions.duplicate && (
        <BarButton
          label={duplicateLabel}
          onClick={act((to) => duplicateBlock(appStore, to))}
        >
          <Copy />
        </BarButton>
      )}
      {permissions.delete && (
        <BarButton
          label={deleteLabel}
          onClick={act((to) => removeBlock(appStore, to))}
        >
          <Trash />
        </BarButton>
      )}
    </div>
  );
};
