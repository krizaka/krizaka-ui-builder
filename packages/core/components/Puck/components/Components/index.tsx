import { useMemo, useState } from "react";

import {
  BLOCK_SEARCH_FROM,
  matchesBlockSearch,
} from "../../../../lib/block-search";
import { useComponentList } from "../../../../lib/use-component-list";
import { useMessage } from "../../../../lib/use-message";
import { useAppStore } from "../../../../store";
import { BlockSearch } from "../../../BlockSearch";
import { ComponentList } from "../../../ComponentList";

/** The blocks that match the search, flat: categories give way to the answer. */
const SearchResults = ({ query }: { query: string }) => {
  const components = useAppStore((s) => s.config.components);
  const empty = useMessage("drawer-search-empty");
  const matches = Object.keys(components).filter((name) =>
    matchesBlockSearch(String(components[name].label ?? name), query)
  );

  if (matches.length === 0) return <p role="status">{empty}</p>;

  return (
    <ComponentList id="search">
      {matches.map((name) => (
        <ComponentList.Item
          key={name}
          name={name}
          label={components[name].label ?? name}
        />
      ))}
    </ComponentList>
  );
};

export const Components = () => {
  const overrides = useAppStore((s) => s.overrides);
  const blockCount = useAppStore(
    (s) => Object.keys(s.config.components).length
  );
  const [query, setQuery] = useState("");

  const componentList = useComponentList();

  const Wrapper = useMemo(() => {
    // DEPRECATED
    if (overrides.components) {
      console.warn(
        "The `components` override has been deprecated and renamed to `drawer`"
      );
    }
    return overrides.components || overrides.drawer || "div";
  }, [overrides]);

  const searching = blockCount >= BLOCK_SEARCH_FROM;

  return (
    <Wrapper>
      {searching && <BlockSearch value={query} onChange={setQuery} />}
      {searching && query.trim() ? (
        <SearchResults query={query} />
      ) : componentList ? (
        componentList
      ) : (
        <ComponentList id="all" />
      )}
    </Wrapper>
  );
};
