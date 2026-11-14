---
"@krizaka/ui-builder": minor
---

A block is added, moved and removed without dragging. The block bar has Move up, Move down, Add after, Duplicate, Remove and Parent block; every row of the block list has an Add button, with a search from 8 blocks; the outline moves a row with Alt+↑ / Alt+↓ or its row menu (Move up, Move down, Move to…), announces the move to a screen reader and keeps the focus on the row; dragging is active only with a fine pointer. The `/document` entry exports `removeBlock`, `moveBlock` and `duplicateBlock`, and the package exports `dictionaryFr` and `dictionaryEn`. Undo pressed right after a change now undoes that change instead of being skipped.
