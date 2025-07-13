# Analysis of `Junctions.c` vs. TypeScript Implementation

This document details the discrepancies found between the original C source code in `orig/Sources/Junctions.c` and its TypeScript reimplementation in `src/walls/init/closeWhites.ts` and `src/walls/init/oneClose.ts`.

The analysis confirms the TypeScript implementation successfully replicates the overall structure and the complex wall-pair detection logic. However, several key discrepancies were identified, primarily in the `oneClose` function, which deviate from the goal of being an exact port.

---

## Summary of Findings

| Discrepancy                                       | File(s)                      | Severity | Description                                                                                                                                                                                                                         |
| ------------------------------------------------- | ---------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Missing `replace_white` Logic**              | `oneClose.ts`                | **High** | The TS code always adds new patches (`addWhite`), whereas the C code conditionally replaces existing patches. This will lead to incorrect visual output with duplicate/overlapping patches.                                        |
| **2. Incorrect `case 10` Fallthrough Emulation**  | `oneClose.ts`                | **Medium** | The C code's `case 10` falls through to `case 11`. The TS code emulates this by copying `case 11`'s logic into `case 10`, creating redundant code and a maintenance hazard.                                                       |
| **3. On-the-fly `length` Calculation**            | `closeWhites.ts`             | **Low**  | The TS code calculates wall `length` via `Math.sqrt` during execution. The C code uses a pre-calculated integer `length` field. This could introduce minor floating-point inaccuracies compared to the original logic. |

---

## Detailed Discrepancy Analysis

### 1. Missing `replace_white` Logic (High Severity)

The most critical deviation is the failure to implement the logic for replacing existing "white" patches. The original C code checks if a patch has already been partially created for a wall (by inspecting the `h1` and `h2` values) and, if so, calls `replace_white` to modify it. The TypeScript implementation omits this check and *always* creates a new patch via `addWhite`.

This will result in incorrect behavior and visual artifacts, as multiple overlapping patches will be generated instead of a single, correctly sized one.

**Affected `one_close` Cases:**

-   `case 0`, `case 14`, `case 15`: Use `(*(j < line->length ? replace_white_2 : add_white_2))`. The TS code acknowledges this in comments but only implements the `add` part.
-   `case 6`, `case 7`, `case 8`: Use `(*(line->h1 > 6 ? replace_white : add_white))`. The TS code only implements the `add` part.

**Example from C (`case 6`):**
```c
// C Code from Junctions.c:440
if (line->h1 >= 6+i)
    return;
(*(line->h1 > 6 ? replace_white : add_white))
    (line->startx + 6, line->starty + 6, i, sepatch);
line->h1 = 6 + i;
```

**Contrasting TypeScript (`case 6`):**
```typescript
// TypeScript from src/walls/init/oneClose.ts:151
if (wall1.h1 >= 6 + i) return { patches, wall1Updates, wall2Updates }

// This should conditionally be a "replace" operation
addWhite(wall1.startx + 6, wall1.starty + 6, i, sepatch) 
wall1Updates.h1 = 6 + i
```

### 2. Incorrect `case 10` Fallthrough Emulation (Medium Severity)

The C `switch` statement for `dir1` has an intentional fallthrough from `case 10` to `case 11`. This means if `dir1` is 10, the logic for *both* cases is executed sequentially.

The TypeScript implementation, where implicit fallthrough is disallowed, attempts to replicate this by copying the entire logic of `case 11` and pasting it at the end of the `case 10` block.

**C Code Structure:**
```c
// C Code from Junctions.c:488
case 10:
    // ... logic for case 10 ...
    // NO BREAK
case 11:
    // ... logic for case 11 ...
    break;
```

**TypeScript Code Structure:**
```typescript
// TypeScript from src/walls/init/oneClose.ts:213, 248
case 10: {
  // ... logic for case 10 ...

  // --- Start of copied case 11 logic ---
  let i11: number | undefined
  if (dir2 === 9) { i11 = 2 } 
  else if ((dir2 as number) === 10) { i11 = 4 }
  if (i11 === undefined) { break }
  // ... rest of case 11 logic ...
  // --- End of copied case 11 logic ---
  break
}

case 11: {
  // The exact same logic as above is duplicated here
  let i11: number
  if (dir2 === 9) { i11 = 2 }
  // ...
  break
}
```

While this produces the correct logical outcome, it is not a true port of the control flow. It introduces code duplication, which is a significant maintenance risk. Any bug fix or change to the `case 11` logic would need to be applied in two separate places.

### 3. On-the-fly `length` Calculation (Low Severity)

In `setInitialOptimization`, the TypeScript code calculates a wall's length just-in-time.

**TypeScript Code:**
```typescript
// TypeScript from src/walls/init/closeWhites.ts:188
const dx = wall.endx - wall.startx
const dy = wall.endy - wall.starty
const length = Math.sqrt(dx * dx + dy * dy)
```

The original C code uses a `length` field that is pre-calculated and stored as part of the `linerec` struct.

**C Code:**
```c
// C Code from Junctions.c:299
line->h2 = line->length + simpleh2[line->newtype];
```

This difference could lead to minor precision differences between the original game's integer-based physics and the new floating-point calculations. While likely not a major issue, it is a deviation from the original data handling.
