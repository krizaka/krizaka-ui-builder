import styles from "./styles.module.css";
import { ReactNode } from "react";
import { getClassNameFactory } from "../../../../lib";
import { useMessage } from "../../../../lib/use-message";
import { useRovingToolbar } from "../../../../lib/use-roving-toolbar";

const getClassName = getClassNameFactory("Nav", styles);
const getClassNameItem = getClassNameFactory("NavItem", styles);

export type MenuItem = {
  label: string;
  onClick?: () => void;
  icon?: ReactNode;
  isActive?: boolean;
  disabled?: boolean;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
};

export const MenuItem = ({
  label,
  icon,
  onClick,
  isActive,
  disabled,
  mobileOnly,
  desktopOnly,
}: MenuItem) => {
  return (
    <li
      role="none"
      className={getClassNameItem({
        active: isActive,
        mobileOnly,
        desktopOnly,
      })}
    >
      {onClick && (
        <button
          type="button"
          className={getClassNameItem("link")}
          onClick={onClick}
          disabled={disabled}
        >
          {icon && <span className={getClassNameItem("linkIcon")}>{icon}</span>}
          <span className={getClassNameItem("linkLabel")}>{label}</span>
        </button>
      )}
    </li>
  );
};

export const Nav = ({
  items,
  mobileActions,
}: {
  items: Record<string, MenuItem>;
  mobileActions?: ReactNode;
}) => {
  // The bottom bar (and the desk's rail) is one toolbar: one Tab stop, the arrows move inside.
  const barProps = useRovingToolbar<HTMLDivElement>({
    label: useMessage("layout-bar"),
    orientation: "both",
  });

  return (
    <div className={getClassName()} {...barProps}>
      <ul role="none" className={getClassName("list")}>
        {Object.entries(items).map(([key, item]) => (
          <MenuItem key={key} {...item} />
        ))}
      </ul>
      {mobileActions && (
        <div className={getClassName("mobileActions")}>{mobileActions}</div>
      )}
    </div>
  );
};
