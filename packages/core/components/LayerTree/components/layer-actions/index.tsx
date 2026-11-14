import { Copy, Trash } from "lucide-react";
import { SyntheticEvent, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

import getClassNameFactory from "../../../../lib/get-class-name-factory";
import { getItem } from "../../../../lib/data/get-item";
import { useAppStore, useAppStoreApi } from "../../../../store";
import { IconButton } from "../../../IconButton";

import { duplicateBlock, removeBlock } from "../../../../lib/block-actions";
import { RowMenu } from "./row-menu";
import { useOutlineDndStoreApi } from "../../lib/store";
import { LayerNode } from "../../types";

import styles from "./styles.module.css";
import { useMessage } from "../../../../lib/use-message";

const getClassName = getClassNameFactory("LayerActions", styles);

/**
 * Renders the actions to manage a layer node.
 */
export const LayerActions = ({
  node,
  visible,
}: {
  node: LayerNode;
  visible: boolean;
}) => {
  const appStore = useAppStoreApi();
  const outlineStore = useOutlineDndStoreApi();

  const permissions = useAppStore(
    useShallow((s) => {
      const item = getItem(
        { index: node.index, zone: node.zoneCompound },
        s.state
      );
      const itemPermissions = s.permissions.getPermissions({ item });

      return {
        drag: itemPermissions.drag,
        delete: itemPermissions.delete,
        duplicate: itemPermissions.duplicate,
      };
    })
  );

  const duplicateMsg = useMessage("outline-item-duplicate");
  const deleteMsg = useMessage("outline-item-delete");

  const deleteItem = useCallback(
    (e: SyntheticEvent<Element>) => {
      // Don't select the component
      e.stopPropagation();

      if (outlineStore.getState().status !== "idle") {
        return;
      }

      removeBlock(appStore, { index: node.index, zone: node.zoneCompound });
    },
    [appStore, outlineStore, node]
  );

  const duplicateItem = useCallback(
    (e: SyntheticEvent<Element>) => {
      // Don't select the component
      e.stopPropagation();

      if (outlineStore.getState().status !== "idle") {
        return;
      }

      duplicateBlock(appStore, { index: node.index, zone: node.zoneCompound });
    },
    [appStore, outlineStore, node.index, node.zoneCompound]
  );

  if (!permissions.delete && !permissions.duplicate && !permissions.drag) {
    return null;
  }

  return (
    <div className={getClassName({ visible })}>
      {permissions.drag && <RowMenu node={node} />}
      {permissions.duplicate && (
        <IconButton onClick={duplicateItem} title={duplicateMsg} type="button">
          <Copy />
        </IconButton>
      )}
      {permissions.delete && (
        <IconButton onClick={deleteItem} title={deleteMsg} type="button">
          <Trash />
        </IconButton>
      )}
    </div>
  );
};
