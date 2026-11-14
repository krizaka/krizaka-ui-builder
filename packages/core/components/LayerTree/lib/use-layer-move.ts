import { useCallback } from "react";

import {
  moveBlock,
  moveBlockToZone,
  moveDestinations,
  type BlockMove,
  type MoveDestination,
  type MoveOutcome,
} from "../../../lib/block-actions";
import { getMessage } from "../../../lib/dictionary";
import { useAppStoreApi } from "../../../store";

import type { LayerNode } from "../types";

import { useAnnounce } from "./announcer";

const ROW_SELECTOR = "[data-puck-layer-row]";

/** After a move the row keeps the focus: the keyboard user is not sent back to the top of the list. */
export const focusLayerRow = (itemId: string) =>
  requestAnimationFrame(() =>
    document
      .querySelector<HTMLElement>(
        `[data-puck-layer-tree-id="${CSS.escape(itemId)}"] ${ROW_SELECTOR}`
      )
      ?.focus()
  );

/** The moves of one outline row (keys and menu), each followed by what a screen reader should hear. */
export const useLayerMove = (node: LayerNode) => {
  const appStore = useAppStoreApi();
  const announce = useAnnounce();
  const at = { zone: node.zoneCompound, index: node.index };

  const say = useCallback(
    (
      key: Parameters<typeof getMessage>[1],
      params: Record<string, string | number>
    ) => announce(getMessage(appStore.getState().dictionary, key, params)),
    [announce, appStore]
  );

  const announceOutcome = (outcome: MoveOutcome, move: BlockMove) => {
    if (outcome.ok) {
      say("outline-moved", {
        label: node.label,
        position: outcome.position,
        total: outcome.total,
      });
      return;
    }
    if (outcome.reason !== "at-edge") return;
    say("outline-moved-edge", {
      label: node.label,
      edge: getMessage(
        appStore.getState().dictionary,
        move === "up" ? "outline-edge-first" : "outline-edge-last"
      ),
    });
  };

  const move = async (direction: BlockMove) => {
    announceOutcome(await moveBlock(appStore, at, direction), direction);
    focusLayerRow(node.itemId);
  };

  const moveToZone = async (zone: string, zoneLabel: string) => {
    const outcome = await moveBlockToZone(appStore, at, zone);
    if (outcome.ok)
      say("outline-movedto", { label: node.label, zone: zoneLabel });
    focusLayerRow(node.itemId);
  };

  const destinations = (): MoveDestination[] => {
    const { state, config, dictionary } = appStore.getState();
    const labelOf = (zone: string) => {
      const [owner, slot] = zone.split(":");
      if (owner === "root") return getMessage(dictionary, "outline-zone-page");
      const type = state.indexes.nodes[owner]?.data.type ?? owner;
      const label = String(config.components[type]?.label ?? type);

      return slot ? `${label} · ${slot}` : label;
    };

    return moveDestinations(state, at, labelOf);
  };

  return { move, moveToZone, destinations };
};
