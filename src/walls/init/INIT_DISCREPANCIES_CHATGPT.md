# INIT_DISCREPANCIES

## organizeWallsByKind

- No significant discrepancies found; logic matches C.

## findFirstWhiteWalls

- The JS version does not explicitly initialize `nextwhId` to `null` for walls that are not of type NNE. In C, all `nextwh` pointers are terminated with `NULL` (`*last = NULL`), ensuring every wall record has a `nextwh` field set. In JS, non-NNE walls have `nextwhId` undefined instead of explicitly `null`.

## detectWallJunctions

- In C, a sentinel junction is pre-populated by setting `junctions[0].x = 20000` before any junctions are added, acting as a termination marker. JS starts with an empty array and appends 18 sentinel entries at the end (`{ x: 20000, y: 0 }`). Functionally equivalent but differs in placement and initial sentinel semantics.
- The C sentinel only sets `x = 20000` and leaves `y` uninitialized; JS uses `y = 0`. This difference in `y` for sentinel entries may affect any code relying on sentinel `y` values.

## initWhites

- C code pads sentinel entries before merging whites, then performs merging, then applies `white_hash_merge()`. JS defers sentinel padding until after hash merge. While JS uses array lengths and may not rely on sentinel for loops, the ordering differs.

## closeWhites

- In C, `h1`/`h2` fields on wall records are updated inline during `one_close()` calls, so subsequent wall-pair detections and patch calculations consider the updated values immediately. JS collects `wallUpdates` and applies all `h1`/`h2` updates only after processing all close-wall pairs, meaning some `oneClose` calls may use stale `h1`/`h2` values.

## oneClose

- Minor potential discrepancy in how replacement white logic is implemented: C loops until it finds a `wh` with `wh->ht < ht` and then replaces, else calls `add_white_2`. JS uses `findIndex` to locate a white with matching `x`, `y`, and `wh.ht < ht`, which appears equivalent, but the two implementations may differ in handling multiple matches or in the order of search.

## whiteHashMerge

- No significant discrepancies found; logic closely mirrors C's `white_hash_merge()`, including boundary checks, neighbor checks, hash pattern application, and junction removal.
