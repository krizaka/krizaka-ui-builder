---
"@krizaka/ui-builder": minor
---

The header holds the content language: the new `contentLanguage` prop of `Puck` (`{ value, options, onChange }`) renders a segmented control there. Undo and Redo are 40 px with a tooltip that names their shortcut. The header, the bottom bar and the selected block's floating bar are each one WAI-ARIA toolbar with a roving tabindex: one Tab stop per bar, the arrow keys, Home and End move inside it. The editor has two more words in French and English (`header-bar`, `header-content-language`, `layout-bar`).
