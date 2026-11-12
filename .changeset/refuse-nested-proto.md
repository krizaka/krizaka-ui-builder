---
"@krizaka/ui-builder": patch
---

`parseDocument` now refuses a `__proto__` key inside a block's props, in a nested slot block, in a nested object of props and in the root props, with one `unsafe_key` issue naming the block and the key, instead of dropping it silently; `constructor` and `prototype` are refused at every depth too. Puck's loader no longer carries a prohibited ARIA attribute, and the viewport zoom select has an accessible name.
