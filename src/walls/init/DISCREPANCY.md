# Wall Initialization Logic: Discrepancy Report

This document details the discrepancies found between the original C implementation in `orig/Sources/Junctions.c` and the new TypeScript implementation in `src/walls/init/`.

The goal of the TypeScript implementation is to EXACTLY recreate the logic of the original C code, with the only changes being to adapt to JavaScript conventions and to keep the functions pure/immutable.

---

## `src/walls/init/initWalls.ts`

This file is the main entry point for wall initialization, corresponding to `init_walls()` in `Junctions.c`.

### Overall `initWalls` Function

- **Discrepancy (Data Flow):** The function `findFirstWhiteWalls` mutates the `walls` array passed into it by setting the `nextwhId` property. However, the `organizedWalls` object returned by `organizeWallsByKind` is created from a _copy_ of the original `walls` array _before_ this mutation happens. The final returned state includes `organizedWalls` which lacks the `nextwhId` updates, and `updatedWalls` from `initWhites`. This creates an inconsistent and fragmented state. The functions should be composed so that updates are passed from one to the next.
- **Discrepancy (Data Flow):** The `initWalls` function calls `initWhites` but does not pass the `firstWhite` ID to it. The original C code relies on a global `firstwhite` pointer that is set before `init_whites()` is called. The TypeScript version must pass this dependency explicitly.

### `organizeWallsByKind()`

- **C Code Reference:** `Junctions.c`, lines 43-53.
- **Discrepancy (Minor):** The linked list is terminated with `nextId = ''` (empty string), whereas the C code uses `NULL`. Using `null` in TypeScript would be a more direct translation. This is a minor stylistic difference but a deviation nonetheless.
- **Observation:** The function correctly follows the immutability principle by creating a new `organizedWalls` record instead of modifying the input. However, this is inconsistent with other functions in the same file (like `findFirstWhiteWalls`).

### `findFirstWhiteWalls()`

- **C Code Reference:** `Junctions.c`, lines 54-61.
- **Discrepancy (Major/Immutability):** This function directly mutates the `walls` array it receives by finding walls and setting their `nextwhId` property. This is a side effect and violates the stated goal of immutability. It should operate on a copy and return the updated data.
- **Discrepancy (Data Flow):** The function returns only the ID of the first white wall (`firstWhiteId`). It does not return the modified wall data containing the new linked list. The caller (`initWalls`) is implicitly relying on the mutation of the `walls` array, which is bad practice and leads to the data flow issues mentioned above.
- **Discrepancy (Minor):** Similar to the previous function, it terminates the linked list with `''` instead of `null`.

### `detectWallJunctions()`

- **C Code Reference:** `Junctions.c`, lines 63-93.
- **Discrepancy (Major/Bug):** The insertion sort algorithm is implemented incorrectly. The line `junctions[j + 1] = junction` should be `junctions[j + 1] = junctions[j]`. The current implementation does not sort the array correctly; it duplicates elements instead of shifting them.
- **Discrepancy (Major/Omission):** The C code explicitly pads the sorted `junctions` array with 18 sentinel values (`x = 20000`). This is a critical step, as later C functions (`fast_hashes`) rely on these sentinels to prevent reading past the end of the array. The TypeScript function omits this padding entirely, which will likely lead to out-of-bounds errors or incorrect behavior in subsequent logic.

---

## `src/walls/init/initWhites.ts`

This file corresponds to the `init_whites()` function and its helpers in `Junctions.c`.

### Overall `initWhites` Function

- **C Code Reference:** `Junctions.c`, lines 199-242.
- **Discrepancy (Major/Omission):** The C code pads the sorted `whites` array with 18 sentinel values (`x = 20000`). This is done so that loops searching through the array (like in `fast_whites`) have a guaranteed termination point and don't run off the end. The TypeScript `initWhites` function omits this step. This is a critical discrepancy that will likely cause issues in the rendering logic that consumes this array.
- **Discrepancy (Data Flow):** The function correctly accepts `junctions` as an argument, which is an improvement over the global state used in C. However, the overall data flow of the entire wall initialization process is still fragmented, as noted in the `initWalls.ts` section.

### `sortWhitesByX()`

- **C Code Reference:** `Junctions.c`, lines 212-222.
- **Observation:** The implementation of the insertion sort is functionally correct and matches the C code's logic, which sorts first by `x` and then by `y`. It also correctly follows the immutability principle by returning a new, sorted array.

### `mergeOverlappingWhites()`

- **C Code Reference:** `Junctions.c`, lines 227-240.
- **Discrepancy (Minor/Implementation):** The C code uses pointer manipulation and an explicit loop to shift array elements after a merge. The TypeScript version uses `result.splice(i + 1, 1)`, which is a modern and idiomatic equivalent but may have different performance characteristics. This is an acceptable adaptation.
- **Discrepancy (Minor/Data Storage):** The C code allocates memory for the new merged bitmap data from a pre-allocated `whitestorage` pool. The TypeScript function modifies the `data` array of the first white record in-place. This is a reasonable adaptation to avoid manual memory management, but it is a difference in approach. The use of `map` to deep-copy the whites initially ensures this mutation doesn't affect the original input.

---

## `src/walls/init/normWhites.ts`

This file corresponds to the `norm_whites()` function in `Junctions.c`.

### `normWhites()`

- **C Code Reference:** `Junctions.c`, lines 245-279.
- **Observation:** The logic appears to be a direct and accurate translation of the C code. It iterates through the walls and adds the appropriate standard and "glitch-fixing" white pieces based on the wall's `newtype`.
- **Discrepancy (Minor/Modernization):** The TypeScript version introduces a unique `id` for each white piece, which is a good practice for managing data in modern applications (e.g., for React keys) but is not present in the original C code. This is an acceptable deviation.
- **Discrepancy (Minor/Omission):** The C code's `add_white` function sets a sentinel value (`wh->x = 20000`) after the last added white. This TypeScript implementation does not. While the main `initWhites` function is responsible for the final padding of the _entire_ array, the original code had this behavior on every add. This is a minor difference in how the list termination is handled during construction.

---

## `src/walls/init/closeWhites.ts`

This file corresponds to the `close_whites()` function in `Junctions.c`.

### Overall `closeWhites` Function

- **C Code Reference:** `Junctions.c`, lines 286-322.
- **Discrepancy (Major/Omission):** The C code initializes a global array `npatch` with `0x003F` values. This array is then used by `one_close` when generating certain patches. The TypeScript implementation completely omits the initialization and use of `npatch`. This will cause incorrect patch data to be generated for specific wall junction cases (e.g., `dir1 == 0` or `dir1 == 8`).
- **Observation:** The function decomposition into `setInitialOptimization`, `findCloseWallPairs`, `processCloseWalls`, and `updateWallOptimization` is a good, modern approach to breaking down the monolithic C function. The data flow is much clearer.

### `findCloseWallPairs()`

- **C Code Reference:** `Junctions.c`, lines 302-321.
- **Discrepancy (Major/Logic):** The C code's logic for finding close pairs is complex and relies on pointer arithmetic within a single sorted array. The TypeScript implementation attempts to replicate this with a `firstIdx` sliding window, but the logic for avoiding duplicate pairs is flawed. The comment `// Skip if wall2 comes before wall1` and the check `if (i > j)` is not a correct or robust way to replicate the C code's behavior of only checking forward in the array. The C code compares `line` with `line2` where `line2` starts from `first` (a sliding window pointer). This ensures each pair is considered only once. The TS implementation's check is dependent on the unstable sort order of the original `walls` array via the `i` and `j` indices from `sortedWalls`.
- **Discrepancy (Major/Logic):** The C code's check is `x1 < x2 + 6 && y1 < y2 + 6`. The TypeScript code uses a `THRESHOLD` of 3 and checks `x1 < x2 + THRESHOLD && y1 < y2 + THRESHOLD`. This seems to miss the full 6x6 box check. The C code's `x2` is pre-decremented by 3 (`(j ? line2->endx : line2->startx) - 3`), so the check `x1 > x2` is equivalent to `x1 > wall2.x - 3`. The TS code checks `x1 > x2 - THRESHOLD`. The logic is subtly different and needs careful verification to ensure it covers the exact same conditions.
- **Discrepancy (Minor/Logic):** The duplicate avoidance check `if (i === j && endpoint2 <= endpoint1)` is an attempt to prevent a wall's endpoint from being compared with itself or its own earlier endpoint. The C code achieves this more naturally because the inner loop for `line2` will process the same line, but the logic inside `one_close` often bails out if the directions are the same. The TS implementation is more explicit, which is good, but it adds complexity that needs to be perfect to match the original's implicit behavior.

### `setInitialOptimization()`

- **C Code Reference:** `Junctions.c`, lines 297-300.
- **Discrepancy (Minor/Logic):** The C code calculates `h2` as `line->length + simpleh2[line->newtype]`. The `length` field in the C `linerec` is pre-calculated. The TypeScript code calculates it as `wall.endx - wall.startx + (simpleh2[wall.newtype] ?? 0)`. This assumes all walls are perfectly horizontal. The original `length` was likely calculated using the Pythagorean theorem for diagonal lines. This will result in incorrect `h2` values for any non-horizontal walls.

---

## `src/walls/init/oneClose.ts`

This file corresponds to the incredibly complex `one_close()` function in `Junctions.c`.

### `oneClose()`

- **C Code Reference:** `Junctions.c`, lines 334-565.
- **Discrepancy (Major/Logic):** The C code uses a `length` property that is pre-calculated for each line. The TypeScript implementation calculates a `length1` variable using only `wall1.endx - wall1.startx`. This is only correct for horizontal lines and will produce incorrect results for all diagonal walls, breaking the logic of every `h2` comparison in the function.
- **Discrepancy (Major/Logic):** The C code uses a complex system of `add_white`, `replace_white`, and `replace_white_2` to either add a new patch or modify an existing one created during `norm_whites`. The TypeScript implementation completely ignores this, _only_ ever adding new patches via its `addWhite` helper. This fundamentally changes the behavior of the algorithm, as it no longer modifies existing white pieces to "close" gaps. For example, in `case 0`, the C code's `(*(j < line->length ? replace_white_2 : add_white_2))` logic is entirely missing.
- **Discrepancy (Major/Logic):** The C code's `switch` statement has a deliberate fall-through from `case 10` to `case 11`. The TypeScript implementation attempts to replicate this by copying the code from `case 11` into the end of `case 10`. This is not equivalent and is a major logic error. It will execute the `case 11` logic with a variable (`i10`) that was calculated for `case 10`, which is not what the original code does. The original code would execute `case 10`, then fall through and execute `case 11`'s logic with `case 11`'s `i` value.
- **Discrepancy (Major/Coordinates):** In several cases (e.g., `case 0`, `case 14`, `case 15`), the C code calls `replace_white_2` or `add_white_2`, which take a _target_ coordinate and a _new_ coordinate. The TypeScript `addWhite` function only takes a single coordinate. The implementation has dropped the target coordinate entirely, resulting in patches being created at the wrong location. For example, in `case 14`, the C code call is `(line->startx + j, line->starty + j, line->endx - i, line->endy - i, i, sepatch)`, but the TS call is `addWhite(wall1.endx - i, wall1.endy - i, i, sepatch)`. This is completely different.
- **Discrepancy (Major/Omission):** As noted previously, the `npatch` array used in `case 0` and `case 8` is not initialized correctly in the TypeScript version, which will lead to incorrect patch data being generated.

---

## `src/walls/init/whiteHashMerge.ts`

This file corresponds to the `white_hash_merge()` function in `Junctions.c`.

### `whiteHashMerge()`

- **C Code Reference:** `Junctions.c`, lines 569-614.
- **Discrepancy (Major/Bug):** The function correctly calculates the new hashed `newData` for a white piece that is situated on a junction. However, it **never applies this new data**. The calculated `newData` is discarded, and the original white piece remains unchanged in the returned array. The line `result[whIndex] = { ...wh, data: newData };` (or similar) is missing.
- **Discrepancy (Major/Bug):** The C code "uses up" a junction by setting its `x` coordinate to a very large number, preventing it from being used again. The TypeScript version finds a `junctionIndex` but never removes the used junction from the `remainingJunctions` array. The line `remainingJunctions.splice(junctionIndex, 1)` is missing inside the `if (junctionIndex !== -1)` block. This allows a single junction to be incorrectly matched with multiple white pieces.
- **Observation:** The logic for choosing a background pattern, rotating it, and applying the hash figure via XOR logic appears to be a faithful and correct replication of the C code's bitwise operations. The use of immutable patterns by copying the `whites` and `junctions` arrays is good practice, but is undermined by the bugs mentioned above.

### `noCloseWh()`

- **C Code Reference:** `Junctions.c`, lines 617-629.
- **Observation:** This helper function appears to be a correct and faithful implementation of the original C logic. It correctly searches for nearby white pieces in both directions (before and after the current piece) and uses the correct distance thresholds.
