import getClassNameFactory from "../../lib/get-class-name-factory";
import styles from "./styles.module.css";

const getClassName = getClassNameFactory("SegmentedControl", styles);
const getOptionClassName = getClassNameFactory(
  "SegmentedControl-option",
  styles
);

export type SegmentedOption = { value: string; label: string };

/**
 * A choice among a few values, one always chosen (the header's content language). The pressed button is the choice;
 * it is a group of buttons so it can sit inside a toolbar and join its roving tabindex.
 */
export const SegmentedControl = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SegmentedOption[];
  onChange: (value: string) => void;
}) => (
  <div role="group" aria-label={label} className={getClassName()}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        lang={option.value}
        aria-pressed={option.value === value}
        className={getOptionClassName({ selected: option.value === value })}
        onClick={() => option.value !== value && onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);
