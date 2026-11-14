import { Search } from "lucide-react";

import getClassNameFactory from "../../lib/get-class-name-factory";
import { useMessage } from "../../lib/use-message";

import styles from "./styles.module.css";

const getClassName = getClassNameFactory("BlockSearch", styles);

/** The search field above a long block list. */
export const BlockSearch = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const label = useMessage("drawer-search");

  return (
    <label className={getClassName()}>
      <Search aria-hidden="true" />
      <input
        type="search"
        className={getClassName("input")}
        value={value}
        placeholder={label}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
};
