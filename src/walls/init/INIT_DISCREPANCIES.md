# Wall Initialization Logic Discrepancies

This document tracks discrepancies between the original C implementation in `Junctions.c` and the new TypeScript implementation in `src/walls/init/`. The goal of the TypeScript version is to be a faithful reproduction of the original logic, with changes only for JS conventions and immutability.

## `initWalls.ts`

### `organizeWallsByKind()` vs. `Junctions.c` lines 43-53

- **Original C:** Uses a pointer-to-a-pointer (`linerec **last`) to build linked lists of walls for each `LineKind`. This is a very efficient, in-place mutation of the `lines` array. `kindptrs` stores pointers to the first line of each kind.
- **TypeScript:** Replicates the logic using modern JavaScript idioms.
  - It returns a new `organizedWalls` object (a record of `LineRec`s) instead of mutating the input array, adhering to functional programming principles.
  - Linked lists are managed via `nextId` string properties, which store the ID of the next wall in the list.
  - `kindPointers` is a record mapping each `LineKind` to the ID of the first wall in its respective list.
  - The logic is functionally identical, but the implementation is immutable and uses references (IDs) instead of direct memory pointers.

**Conclusion:** The TypeScript implementation is a faithful adaptation of the C code's logic, correctly translated into an immutable, reference-based system suitable for JavaScript. No discrepancies in behavior were found.

### `findFirstWhiteWalls()` vs. `Junctions.c` lines 54-61

- **Original C:** Iterates through all lines and builds a separate linked list (`firstwhite`) for lines of `newtype` `NEW_NNE`. It uses a pointer-to-pointer (`linerec **last`) to link the `nextwh` property of each wall, modifying them in place.
- **TypeScript:** Achieves the same outcome immutably.
  - It iterates through the input `walls` and identifies those with `newtype === NEW_TYPE.NNE`.
  - It builds a new `updatedWalls` record, populating the `nextwhId` property to form a linked list, similar to how `organizeWallsByKind` works.
  - It returns the ID of the first wall in the list (`firstWhiteId`) and the `updatedWalls` record.

**Conclusion:** The TypeScript function correctly reproduces the logic of the C code by creating a linked list of NNE walls. The implementation is adapted for an immutable environment using object IDs for linking instead of pointers. No logical discrepancies are present.

### `detectWallJunctions()` vs. `Junctions.c` lines 63-93

- **Original C:** This block of code identifies unique wall endpoints to create "junctions."
  - It iterates through every line's start and end points.
  - For each point, it checks if a junction already exists within a 3-pixel tolerance in both x and y.
  - If no existing junction is close enough, it adds a new one to a global `junctions` array.
  - After finding all junctions, it performs an in-place insertion sort on the `junctions` array, ordering them by their x-coordinate.
  - Finally, it pads the array with 18 "sentinel" junctions with a very large x-coordinate (`20000`) to prevent out-of-bounds reads in later processing steps.
- **TypeScript:** The `detectWallJunctions` function mirrors this logic.
  - It iterates through walls and their endpoints, just like the C code.
  - It uses an identical `(x +/- 3, y +/- 3)` bounding box to check for and merge nearby junctions.
  - It builds a `junctions` array, which is returned by the function (maintaining purity).
  - It implements a functionally identical insertion sort to order the junctions by their x-coordinate.
  - It correctly appends the 18 sentinel junction records.

**Conclusion:** The TypeScript implementation is a faithful reproduction of the C code's logic for detecting, sorting, and padding junctions. The use of a modern insertion sort algorithm and returning a new array are appropriate adaptations for TypeScript and do not change the final result.

## `initWhites.ts`

### `initWhites()` vs. `Junctions.c` lines 199-242

- **Original C:** This is the main function for initializing "whites," which are special bitmap patterns used for wall rendering.
  - It calls `norm_whites()` to create the standard set of white patterns based on wall types.
  - It calls `close_whites()` to generate additional "patch" patterns where walls are close to each other.
  - It performs an in-place insertion sort on the global `whites` array.
  - It merges whites that are at the exact same location and have a height of 6 by ANDing their bitmap data together. This is an in-place modification that shrinks the array.
  - It calls `white_hash_merge()` to apply a special hash pattern to whites that coincide with junctions.
  - Finally, it pads the `whites` array with 18 sentinel values.
- **TypeScript:** The `initWhites` function orchestrates the same sequence of events, but with immutable operations.
  - It calls `normWhites()` and `closeWhites()`, concatenating their results into a new `whites` array.
  - It calls a pure `sortWhitesByX` function that returns a new sorted array.
  - It calls a pure `mergeOverlappingWhites` function that returns a new array with the merged whites.
  - It calls a pure `whiteHashMerge` function that returns a new array with the hashed whites.
  - It calls `addSentinelWhites` to append the sentinel values and return the final array.

**Conclusion:** The TypeScript `initWhites` function is a direct logical equivalent of its C counterpart. It breaks down the steps into smaller, pure functions, which is a good practice and does not introduce any behavioral discrepancies. The individual sub-functions will be analyzed next.

### `sortWhitesByX()` vs. `Junctions.c` lines 212-222

- **Original C:** Performs an in-place insertion sort on the global `whites` array. The primary sort key is `x`, and the secondary key is `y`.
- **TypeScript:** The `sortWhitesByX` function creates a copy of the input array and then performs an insertion sort that is functionally identical to the C version, comparing `x` first and then `y`. It returns a new, sorted array.

**Conclusion:** The logic is identical. The TypeScript version is pure, which is a good adaptation.

### `mergeOverlappingWhites()` vs. `Junctions.c` lines 227-240

- **Original C:** Iterates through the sorted `whites` array. When it finds two adjacent whites at the exact same `(x, y)` coordinate with a height of 6, it merges them. The merge involves allocating new memory for a 6-integer bitmap, ANDing the data from the two whites into it, updating the first white's `data` pointer to this new block, and then shifting the rest of the array elements down to overwrite the second white (effectively deleting it).
- **TypeScript:** The `mergeOverlappingWhites` function replicates this logic immutably.
  - It iterates through a copy of the `whites` array.
  - When it finds a match (`x`, `y`, and `ht === 6`), it creates a new `data` array by ANDing the corresponding values from the two whites.
  - It updates the `data` of the first white and then removes the second white from the array using `splice`. This is done on a copy, so the original array is not mutated.

**Conclusion:** The logic is a direct and correct translation. The core operation—finding adjacent, identical-position whites and merging their data with a bitwise AND—is preserved.

## `normWhites.ts`

### `normWhites()` vs. `Junctions.c` lines 245-279

- **Original C:** Iterates through all `lines`.
  - For each line, it checks the `whitepicts` table. If a pattern is defined for the line's `newtype` at either the start (index 0) or end (index 1), it calls `add_white()` to add a new white piece at the corresponding endpoint.
  - It then has a `switch` statement to add special "glitch-fixing" white pieces for `NEW_NE`, `NEW_ENE`, and `NEW_ESE` wall types at calculated offsets from the wall's endpoints.
  - The `add_white` function adds a `whiterec` to a global array and increments a counter.
- **TypeScript:** The `normWhites` function is a direct translation.
  - It iterates through the `walls` array.
  - It uses the same `whitepicts` data (imported from `whitePatterns.ts`) to add the standard white pieces for each endpoint.
  - It has an identical `switch` statement that adds the same glitch-fixing pieces for the same wall types at the same offsets.
  - It returns a new array of `WhiteRec` objects.

**Conclusion:** The logic is identical. The TypeScript implementation correctly generates the same set of standard and glitch-fixing white pieces as the original C code.

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
  - This means that where the C code would modify a single patch multiple times, the TypeScript version will generate multiple, overlapping patches. This is a significant deviation from the original logic. While the final visual result *might* be the same (if the last-drawn patch correctly covers the previous ones), the underlying data is different, and it's less efficient. The goal of exactly recreating the logic is not met here.

**Conclusion:** This is the most significant discrepancy found. The TypeScript implementation simplifies the logic by omitting the stateful "replace" behavior of the original C code, which may lead to different intermediate data and potential rendering artifacts if the patches are not fully opaque.

## `whiteHashMerge.ts`

### `whiteHashMerge()` vs. `Junctions.c` lines 568-618

- **Original C:** This function applies a "hash" pattern to certain whites that coincide with a junction.
  - It iterates through the `whites` array.
  - For a white to be considered, it must have `ht == 6`, be outside the screen edge (`x > 8`), and not be close to any other white (`no_close_wh`).
  - If a white meets these criteria, it searches the `junctions` array to see if a junction exists at the exact same `(x, y)` coordinate.
  - If a junction is found, it modifies the white's `data` by XORing it with a `hash_figure` pattern, influenced by a rotating background pattern bit. It also sets `hasj = TRUE` and removes the junction from the `junctions` array to prevent it from being drawn separately.
- **TypeScript:** The `whiteHashMerge` function is a faithful, immutable-style reproduction.
  - It iterates over a copy of the `whites` array.
  - The conditions for considering a white (`ht === 6`, `x > 8`, and passing the `noCloseWh` check) are identical.
  - It correctly searches for a matching junction.
  - If a match is found, it creates a new `data` array with the identical hash pattern logic (XORing with `hash_figure` and the rotating background bit).
  - It returns a new `whites` array with the modified white and a new `junctions` array with the corresponding junction removed.

**Conclusion:** The logic in `whiteHashMerge` is a perfect and correct translation of the original C code into a functional, immutable paradigm. No discrepancies were found.

