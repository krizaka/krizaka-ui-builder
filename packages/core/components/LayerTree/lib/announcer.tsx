import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

import getClassNameFactory from "../../../lib/get-class-name-factory";

import styles from "../styles.module.css";

const getClassName = getClassNameFactory("LayerTreeRoot", styles);

const AnnounceContext = createContext<(message: string) => void>(() => {});

/** Says a message to a screen reader, politely, without moving the focus (WCAG 4.1.3). */
export const useAnnounce = () => useContext(AnnounceContext);

/** Holds the polite live region of the outline and gives `useAnnounce` to the rows below it. */
export const LayerAnnouncer = ({ children }: { children: ReactNode }) => {
  const [message, setMessage] = useState("");
  // The same message twice in a row must still be read: a trailing space makes the text node change.
  const announce = useCallback(
    (next: string) =>
      setMessage((previous) => (previous === next ? `${next} ` : next)),
    []
  );

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div
        className={getClassName("announcer")}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {message}
      </div>
    </AnnounceContext.Provider>
  );
};
