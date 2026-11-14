import { useState } from "react";
import { PointerSensor } from "@dnd-kit/react";
import { PointerActivationConstraints } from "@dnd-kit/dom";
import type { Draggable, PointerSensorOptions } from "@dnd-kit/dom";
import type { ActivationConstraint } from "@dnd-kit/abstract";
import isDraggingFromHandle from "./is-dragging-from-handle";
import { isFinePointer } from "./fine-pointer";

const { Delay, Distance } = PointerActivationConstraints;

export type ActivationConstraints = ActivationConstraint<PointerEvent>[];

const touchDefault: ActivationConstraints = [
  new Delay({ value: 200, tolerance: 10 }),
];

const otherDefault: ActivationConstraints = [
  new Delay({ value: 200, tolerance: 10 }),
  new Distance({ value: 5 }),
];

type UseSensorsOptions = {
  /** Activation constraints for the mouse pointer, only used when dragging from the handle */
  mouse?:
    | ActivationConstraints
    | ((
        event: PointerEvent,
        source: Draggable
      ) => ActivationConstraints | undefined);
  /** Activation constraints for the touch pointer */
  touch?:
    | ActivationConstraints
    | ((
        event: PointerEvent,
        source: Draggable
      ) => ActivationConstraints | undefined);
  /** Activation constraints for other pointer types */
  other?:
    | ActivationConstraints
    | ((
        event: PointerEvent,
        source: Draggable
      ) => ActivationConstraints | undefined);
  /** Elements that can start a drag. Defaults to the handle, or the element. Always none on a coarse pointer. */
  activatorElements?: PointerSensorOptions["activatorElements"];
};

const startElements = (
  option: UseSensorsOptions["activatorElements"],
  source: Draggable
) => {
  if (typeof option === "function") return option(source);

  return option ?? [source.handle ?? source.element];
};

export const useSensors = (
  {
    other = otherDefault,
    mouse,
    touch = touchDefault,
    activatorElements,
  }: UseSensorsOptions = {
    touch: touchDefault,
    other: otherDefault,
  }
) => {
  const [sensors] = useState(() => [
    PointerSensor.configure({
      activatorElements: (source) =>
        isFinePointer() ? startElements(activatorElements, source) : [],
      activationConstraints(event, source) {
        const { pointerType } = event;

        if (
          pointerType === "mouse" &&
          isDraggingFromHandle({ event, source })
        ) {
          return typeof mouse === "function" ? mouse(event, source) : mouse;
        }

        if (pointerType === "touch") {
          return typeof touch === "function" ? touch(event, source) : touch;
        }

        return typeof other === "function" ? other(event, source) : other;
      },
    }),
  ]);

  return sensors;
};
