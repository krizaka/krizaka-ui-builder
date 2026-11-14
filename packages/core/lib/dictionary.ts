/**
 * Default messages for every hard-coded string shown in the Puck editor UI.
 *
 * Tokens follow a `{area}-{name}-{variant}` structure, where hyphens only
 * separate segments (compound words within a segment are concatenated, e.g.
 * `field-arrayitem-summary`).
 */
export const defaultDictionary = {
  // Header
  "header-publish": "Publish",
  "header-undo": "undo",
  "header-redo": "redo",
  "header-bar": "Page actions",
  "header-content-language": "Content language",
  "layout-bar": "Editor panels",
  "header-toggle-leftsidebar": "Toggle left sidebar",
  "header-toggle-rightsidebar": "Toggle right sidebar",
  "header-toggle-menubar": "Toggle menu bar",
  // Component action bar
  "action-bar": "Block actions",
  "action-selectparent": "Parent block",
  "action-drag": "Drag to reorder",
  "action-moveup": "Move up",
  "action-movedown": "Move down",
  "action-addafter": "Add a block after",
  "action-duplicate": "Duplicate",
  "action-delete": "Remove",
  // Fallback labels — shared by the breadcrumbs, fields panel and header
  "label-page": "Page",
  "label-component": "Component",
  // Outline
  "outline-empty": "No items",
  "outline-item-collapse": "Collapse",
  "outline-item-expand": "Expand",
  "outline-header-title": "Outline",
  "outline-header-collapseall": "Collapse all",
  "outline-item-duplicate": "Duplicate",
  "outline-item-delete": "Remove",
  "outline-item-menu": "More actions for {label}",
  "outline-item-moveup": "Move up",
  "outline-item-movedown": "Move down",
  "outline-item-moveto": "Move to…",
  "outline-moveto-end": "{zone}, at the end",
  "outline-zone-page": "Page",
  "outline-moved": "{label} moved to position {position} of {total}",
  "outline-moved-edge": "{label} is already {edge}",
  "outline-edge-first": "first",
  "outline-edge-last": "last",
  "outline-movedto": "{label} moved to {zone}",
  // Drawer (component list)
  "drawer-category-collapse": "Collapse {title}",
  "drawer-category-expand": "Expand {title}",
  "drawer-category-other": "Other",
  "drawer-item-add": "Add {label}",
  "drawer-search": "Search blocks",
  "drawer-search-empty": "No block matches",
  // Canvas
  "canvas-noconfig": "No configuration for {type}",
  // Fields
  "field-readonly": "Read-only",
  "field-select": "Select",
  "field-arrayitem-summary": "Item #{index}",
  "field-arrayitem-duplicate": "Duplicate",
  "field-arrayitem-delete": "Delete",
  // Viewport controls
  "viewport-zoom-in": "Zoom viewport in",
  "viewport-zoom-select": "Zoom level",
  "viewport-zoom-out": "Zoom viewport out",
  "viewport-zoom-auto": "{zoom}% (Auto)",
  "viewport-toggle-menu": "Toggle viewport menu",
  "viewport-switch": "Switch to {label} viewport",
  "viewport-switch-default": "Switch viewport",
  // Plugin bar
  "plugin-blocks": "Blocks",
  "plugin-outline": "Outline",
  "plugin-fields": "Fields",
  "plugin-components": "Components",
  // Layout
  "layout-maximize": "maximize",
  "layout-minimize": "minimize",
  // Loader
  "loader-loading": "loading",
} as const;

export type DictionaryKey = keyof typeof defaultDictionary;

/**
 * Override any of Puck's built-in UI strings, or provide your own custom strings.
 */
export type Dictionary = Partial<
  Record<DictionaryKey, string> & Record<string, string>
>;

/**
 * Replace `{placeholder}` tokens in a template.
 */
const interpolate = (
  template: string,
  params: Record<string, string | number>
): string =>
  template.replace(/\{(\w+)\}/g, (match, key) =>
    params[key] !== undefined ? String(params[key]) : match
  );

/**
 * Resolve a message: the dictionary override if present, otherwise the built-in
 * default, with optional `{placeholder}` interpolation.
 *
 * This is the single place message resolution happens. Components use `useMessage`
 * to read messages reactively.
 */
export const getMessage = (
  dictionary: Dictionary,
  key: DictionaryKey,
  params?: Record<string, string | number>
): string => {
  const message = dictionary[key] ?? defaultDictionary[key];

  return params ? interpolate(message, params) : message;
};
