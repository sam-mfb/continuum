# Wall Initialization Logic Discrepancies

This document tracks discrepancies between the original C implementation in `Junctions.c` and the new TypeScript implementation in `src/walls/init/`. The goal of the TypeScript version is to be a faithful reproduction of the original logic, with changes only for JS conventions and immutability.

## `closeWhites.ts`

### `closeWhites()` vs. `Junctions.c` lines 288-321

- **Original C:** This function is complex. Its goal is to find wall endpoints that are very close to each other and add special "patch" whites to smooth the visual connection.
  - It first initializes `h1` and `h2` properties on each line. These seem to be state variables tracking how much of the line has been "covered" by patches.
  - It then enters a nested loop (`line` -> `line2`). It uses a clever optimization where the inner loop only starts from a `first` pointer that is advanced as the outer loop progresses, avoiding redundant checks.
  - The core logic inside the loops checks if the endpoints of `line` and `line2` are within a small bounding box (`x1 > x2 && y1 > y2 && x1 < x2 + 6 && y1 < y2 + 6`).
  - If they are close, it calls `one_close()` to potentially add a patch.
- **TypeScript:** The `closeWhites` function reproduces this logic.
  - It first calculates and adds `h1` and `h2` to local copies of the wall objects.
  - It uses a similar nested loop structure with the `first` pointer optimization to iterate through wall pairs.
  - The bounding box check is identical.
  - If the check passes, it calls `oneClose()`.
  - `oneClose` is a pure function that returns a new patch (`WhiteRec`) and the updated walls, which are then collected.

**Conclusion:** The overall structure and logic are faithfully reproduced. The optimization with the `first` pointer is correctly implemented. The most complex logic is inside `one_close`, which is analyzed next.

### `oneClose()` vs. `Junctions.c` lines 334-565

- **Original C:** This is a very large and complex function that forms the core of the `close_whites` logic.
  - It calculates two direction values (`dir1`, `dir2`) based on the types and endpoints of the two walls being compared.
  - It uses a giant `switch` statement based on these directions to handle every possible geometric interaction.
  - Inside each case, it calculates the size (`i`) and position of a patch.
  - Crucially, it uses the `h1` and `h2` values on the `linerec` to decide whether to `add_white` or `replace_white`. If a patch has already been created for an endpoint (indicated by `h1` or `h2` having changed from their initial values), it calls `replace_white` to update the existing patch. Otherwise, it calls `add_white`. This is a stateful optimization to avoid creating redundant whites.
- **TypeScript:** The `oneClose` function reproduces the control flow but differs in its state management.
  - The direction calculations and the `switch` statement structure are identical.
  - The logic for calculating patch size (`i`) and position is the same.
  - **DISCREPANCY:** The TypeScript version **always adds** a new patch (`addWhite`). It does not implement the `replace_white` logic. The function is pure and simply returns a list of new patches to be created. The calling `closeWhites` function simply concatenates all patches from all `oneClose` calls.
  - This means that where the C code would modify a single patch multiple times, the TypeScript version will generate multiple, overlapping patches. This is a significant deviation from the original logic. While the final visual result _might_ be the same (if the last-drawn patch correctly covers the previous ones), the underlying data is different, and it's less efficient. The goal of exactly recreating the logic is not met here.

**Conclusion:** This is the most significant discrepancy found. The TypeScript implementation simplifies the logic by omitting the stateful "replace" behavior of the original C code, which may lead to different intermediate data and potential rendering artifacts if the patches are not fully opaque.
