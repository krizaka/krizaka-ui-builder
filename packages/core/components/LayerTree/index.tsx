import getClassNameFactory from "../../lib/get-class-name-factory";
import { useAppStore } from "../../store";

import { LayerAnnouncer } from "./lib/announcer";
import { LayerTreeZone } from "./components/layer-tree-zone";
import { OutlineDndProvider } from "./components/outline-dnd-provider";
import type { LayerZone } from "./types";

import styles from "./styles.module.css";

export { buildLayerTree } from "./lib/build-layer-tree";

const getClassNameDragRoot = getClassNameFactory("LayerTreeRoot", styles);

/**
 * Renders a draggable outline for the provided trees
 */
export const LayerTree = ({
  selectedId,
  trees,
}: {
  selectedId: string | null;
  trees: LayerZone[];
}) => {
  const disableOutlineDrag = useAppStore(
    (s) => s.dnd?.disableOutlineDrag ?? false
  );

  return (
    <OutlineDndProvider>
      <LayerAnnouncer>
        <div
          className={getClassNameDragRoot()}
          data-puck-dnd-disabled={disableOutlineDrag || undefined}
        >
          {trees.map((tree) => (
            <LayerTreeZone
              depth={0}
              key={tree.zoneCompound}
              selectedId={selectedId}
              tree={tree}
            />
          ))}
        </div>
      </LayerAnnouncer>
    </OutlineDndProvider>
  );
};
