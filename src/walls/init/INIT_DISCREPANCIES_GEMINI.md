# `initWalls` Discrepancies

This file documents discrepancies between the C code in `Junctions.c` and the TypeScript implementation in `initWalls.ts`.

## `initWalls()` / `init_walls()`

The overall structure of the TypeScript code is different from the C code. The `init_walls` function in C is a single large function. The TypeScript code breaks this down into smaller, more manageable functions (`organizeWallsByKind`, `findFirstWhiteWalls`, `detectWallJunctions`), which is a deliberate and positive architectural change.

### `organizeWallsByKind`

- **Immutability:** The C code modifies the global `lines` array in-place to create linked lists. The TypeScript function follows functional programming principles by creating a new `organizedWalls` object, avoiding direct mutation of the input. This is an intentional and beneficial change.

### `findFirstWhiteWalls`

- **Immutability:** Similar to `organizeWallsByKind`, the C code mutates the `lines` array to create the `nextwh` linked list. The TypeScript function creates a copy of the walls to work with, preserving the immutability of the original data.

### `detectWallJunctions`

- **Initial Sentinel Value:** The C code initializes `junctions[0].x = 20000` before the loop, which is immediately overwritten. The loop logic ensures the first endpoint is always added. The TypeScript code starts with an empty array, which has the same net effect. This is a minor implementation difference that doesn't alter the outcome.
- **Sentinel Padding:** The C code pads the sorted `junctions` array with 18 sentinels, but only sets the `x` coordinate, leaving `y` uninitialized. The TypeScript code explicitly sets `y` to `0` for these sentinels (`{ x: 20000, y: 0 }`). This is a safer approach that avoids potential issues with uninitialized data.

## `initWhites()` / `init_whites()`

The `init_whites` function in C is a single function that orchestrates several steps. The TypeScript `initWhites` function is a higher-level orchestrator that calls other specialized functions, many of which are in their own files. This is a good architectural improvement.

- **State Management:** The C code relies heavily on global variables (`whites`, `numwhites`, `whitestorage`, `whitesused`) and mutates them directly. The TypeScript implementation is functional, taking state as input and returning new, modified state. This makes the code much cleaner, more predictable, and easier to test.
- **Sorting (`sortWhitesByX`):** The sorting logic is identical to the C code's insertion sort (sorting by `x`, then `y`). The TypeScript version operates on a copy of the array, adhering to immutable principles.
- **Merging (`mergeOverlappingWhites`):** The logic for merging whites at the same location is identical. The C code allocates new memory for the merged data from a pre-allocated `whitestorage` pool. The TypeScript version modifies the `data` of the first white object and removes the second, which is a more idiomatic approach in JavaScript.
- **Sentinel Padding (`addSentinelWhites`):** The C code adds 18 sentinels to the `whites` array but only initializes their `x` coordinate. The TypeScript `addSentinelWhites` function initializes all fields (`x`, `y`, `hasj`, `ht`, `data`) to safe default values, which is a good improvement.

## `normWhites()` / `norm_whites()`

The `norm_whites` function generates the initial set of "white" shadow pieces for wall endpoints and to fix graphical glitches.

- **Logic:** The core logic is identical to the C code. It iterates through each wall and adds white pieces based on the wall's `newtype` and predefined patterns.
- **State Management:** The C code's `add_white` function modifies a global `whites` array and a `numwhites` counter. The TypeScript `normWhites` function is pure; it creates and returns a new array of whites.
- **Sentinel Handling:** The C `add_white` function places a sentinel value (`x = 20000`) after every white it adds. This sentinel is immediately overwritten by the next call. The TypeScript `addWhiteWithSentinel` helper function faithfully reproduces this behavior for accuracy, even though it's not strictly necessary in JavaScript. The function then returns a slice of the array to exclude the final running sentinel, matching the effective contents of the C array. This is a high-fidelity translation.

## `closeWhites()` / `close_whites()`

This function is responsible for finding wall endpoints that are very close together and generating "patch" whites to smooth the graphical transition between them. It also calculates and updates `h1` and `h2` optimization values on the walls.

- **Architecture:** The TypeScript implementation is a major architectural improvement. The single, complex `close_whites` function from the C code has been broken down into smaller, single-responsibility functions (`setInitialOptimization`, `findCloseWallPairs`, `processCloseWalls`, `updateWallOptimization`). This makes the code significantly easier to understand, test, and maintain.
- **Logic (`findCloseWallPairs`):** The core logic for finding pairs of close walls is identical to the C code. The TypeScript `findCloseWallPairs` function perfectly replicates the C code's nested loops and the sliding `first` pointer optimization.
- **State Management:** The C code mutates the global `lines` array (for `h1`/`h2` values) and adds new whites to the global `whites` array via calls to `one_close`. The TypeScript implementation is purely functional. It passes wall data through a series of transformations and returns a final result containing the new patches and the updated wall records. This is a much safer and more modern approach.
- **Data Locality:** The C code initializes a global `npatch` array that is used by the `one_close` function. In the TypeScript version, this data is defined in `patchPatterns.ts` and imported directly into `oneClose.ts`, which is a better practice for data locality.

## `oneClose()` / `one_close()`

This is the logical core of the junction-patching system, containing a large `switch` statement to handle all the different ways two wall endpoints can meet.

- **Fidelity:** The TypeScript implementation is an extremely faithful, line-by-line recreation of the C code's logic. The complex `switch` statement, the direction calculations, the conditions for adding or replacing whites, and the patterns used are all identical.
- **State Management:** This is the most critical and beneficial difference. The C function operates entirely through side effects: modifying the global `whites` array and directly mutating the `h1`/`h2` fields of the `linerec` structs passed to it. The TypeScript function is pure. It takes the current state (walls and whites) as input and returns an object containing the newly generated whites and any pending `h1`/`h2` updates. This makes the logic completely self-contained and testable.
- **Helper Functions:** The C code relies on global `add_white` and `replace_white` functions. The TypeScript `oneClose` function defines its own local, immutable versions of these helpers, which improves encapsulation.
- **Fall-throughs:** The C code's intentional `switch` case fall-throughs are correctly and explicitly handled in the TypeScript code, demonstrating a careful translation.

## `whiteHashMerge()` / `white_hash_merge()`

This function finds specific white pieces that correspond to wall junctions and applies a "hash" pattern to them, which helps blend the junction into the game's background texture.

- **Fidelity:** The logic is a direct and precise translation of the C code.
- **`no_close_wh`:** The helper function `noCloseWh` is a faithful implementation of the C original, correctly checking for nearby whites.
- **State Management:** The C code mutates global `whites` and `junctions` arrays. The TypeScript function is pure, taking whites and junctions as input and returning a new array of modified whites. It manages its own copy of the junctions list to track which ones have been processed.
- **Assembly Translation:** The C code contains a critical inline assembly instruction, `rol.w #1, back`, which performs a 16-bit rotate-left operation. The TypeScript code **excellently** simulates this with the bitwise JavaScript expression `((rotatedBack << 1) | (rotatedBack >>> 15)) & 0xffff`. This is a high-fidelity translation of a machine-specific instruction, which is crucial for achieving the same visual output.
- **Data Allocation:** The C code has logic to either modify a white's data in-place or allocate new memory from a `whitestorage` pool. The TypeScript code always creates a new `data` array for the modified white, which is a simpler and safer approach for a garbage-collected language.
