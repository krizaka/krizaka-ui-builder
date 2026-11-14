import { forwardRef, ReactNode, SyntheticEvent, useState } from "react";
import styles from "./IconButton.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { Loader } from "../Loader";

const getClassName = getClassNameFactory("IconButton", styles);

/** « ⌘Z » or « Ctrl+Shift+Z » as the aria-keyshortcuts grammar (« Meta+Z », « Control+Shift+Z »). */
const ariaShortcut = (shortcut: string) =>
  shortcut
    .replace("⌘", "Meta+")
    .replace("⇧", "Shift+")
    .replace("Ctrl", "Control");

export const IconButton = forwardRef<
  HTMLButtonElement & HTMLAnchorElement,
  {
    active?: boolean;
    children: ReactNode;
    href?: string;
    onClick?: (e: SyntheticEvent) => void | Promise<void>;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    tabIndex?: number;
    newTab?: boolean;
    fullWidth?: boolean;
    title: string;
    /** The keyboard shortcut, shown in the tooltip and announced (aria-keyshortcuts). */
    shortcut?: string;
    /** `large` is the 40 px target of the header's history buttons. */
    size?: "default" | "large";
    suppressHydrationWarning?: boolean;
  }
>(
  (
    {
      active = false,
      children,
      href,
      onClick,
      type,
      disabled,
      tabIndex,
      newTab,
      fullWidth,
      title,
      shortcut,
      size = "default",
      suppressHydrationWarning,
      ...rest
    },
    ref
  ) => {
    const [loading, setLoading] = useState(false);

    const ElementType = href ? "a" : "button";

    return (
      <ElementType
        {...rest}
        ref={ref}
        className={getClassName({
          active,
          disabled,
          fullWidth,
          large: size === "large",
        })}
        onClick={(e) => {
          if (!onClick) return;

          setLoading(true);
          Promise.resolve(onClick(e)).then(() => {
            setLoading(false);
          });
        }}
        type={type}
        disabled={disabled || loading}
        tabIndex={tabIndex}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noreferrer" : undefined}
        href={href}
        title={shortcut ? `${title} (${shortcut})` : title}
        aria-label={title}
        aria-keyshortcuts={shortcut ? ariaShortcut(shortcut) : undefined}
        data-size={size}
        suppressHydrationWarning={suppressHydrationWarning}
      >
        {children}
        {loading && (
          <>
            &nbsp;&nbsp;
            <Loader size={14} />
          </>
        )}
      </ElementType>
    );
  }
);

IconButton.displayName = "IconButton";
