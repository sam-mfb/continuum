# Init Discrepancies Between JavaScript and Original C Code

This document compares the JavaScript/TypeScript implementations in src/walls/init/ with the original C code from orig/Sources/Junctions.c.

## Function-by-Function Analysis

### 1. init_walls() vs initWalls()

**C function**: Junctions.c:34-96
**JS function**: initWalls.ts:11-50

#### Key Differences:
1. **Function splitting**: The JS version splits init_walls() into 4 separate functions:
   - `organizeWallsByKind()` - handles lines 43-53 of C
   - `findFirstWhiteWalls()` - handles lines 54-61 of C
   - `detectWallJunctions()` - handles lines 63-93 of C
   - Main `initWalls()` orchestrates these

2. **Data structures**:
   - C uses raw arrays and pointers (`linerec *kindptrs[]`, `linerec *firstwhite`)
   - JS uses objects with string IDs (`Record<string, LineRec>`, `kindPointers: Record<LineKind, string | null>`)
   - C uses `next` pointer in linerec, JS uses `nextId` string
   - C uses `nextwh` pointer, JS uses `nextwhId` string

3. **Return values**:
   - C modifies global variables (`kindptrs`, `firstwhite`, `junctions`, `numjunctions`)
   - JS returns a WallsState object containing all state

4. **Junction sorting**:
   - Both use insertion sort
   - C sorts in ascending order (movej->x < (movej-1)->x)
   - JS sorts in ascending order too (junction.x <= temp.x)
   - Both implementations correctly match

5. **Memory management**:
   - C uses pre-allocated arrays with fixed sizes
   - JS uses dynamic arrays
   - Both add 18 sentinel junctions with x=20000

6. **Immutability**:
   - C modifies walls in-place
   - JS creates copies of walls to maintain immutability

### 2. init_whites() vs initWhites()

**C function**: Junctions.c:199-242
**JS function**: initWhites.ts:12-42

#### Key Differences:
1. **Function organization**:
   - C calls norm_whites(), close_whites(), white_hash_merge() as procedures with side effects
   - JS splits sorting/merging into separate pure functions: sortWhitesByX(), mergeOverlappingWhites(), addSentinelWhites()

2. **Global state**:
   - C uses global variables `whitestorage`, `whitesused`, `whites`, `numwhites`
   - JS returns whites array and updated walls in an object

3. **Sorting algorithm**:
   - Both use insertion sort
   - C condition: `movewh->x <= (movewh-1)->x && (movewh->x < (movewh-1)->x || movewh->y < (movewh-1)->y)`
   - JS condition: `element.x < temp.x || (element.x === temp.x && element.y <= temp.y)`
   - **DISCREPANCY**: The logic differs slightly:
     - C moves elements when x is less OR (x equal AND y less)
     - JS keeps elements when x is less OR (x equal AND y less-or-equal)
     - This could result in different ordering of whites with same x,y coordinates

4. **Merging overlapping whites**:
   - C modifies array in-place by shifting elements left
   - JS uses splice() to remove merged elements
   - Both correctly handle merging multiple consecutive whites at same position

5. **White storage**:
   - C allocates from a shared whitestorage array
   - JS creates new arrays for merged data

6. **Sentinel values**:
   - Both add 18 sentinels with x=20000
   - JS also adds an id field for tracking

### 3. norm_whites() vs normWhites()

**C function**: Junctions.c:245-279
**JS function**: normWhites.ts:76-150

#### Key Differences:
1. **White piece creation**:
   - C uses global add_white() function that modifies global whites array
   - JS uses local addWhiteWithSentinel() helper that appends to local array
   
2. **Running sentinel behavior**:
   - C's add_white() sets wh++; wh->x = 20000 after each addition
   - JS mimics this by adding a temporary sentinel after each white
   - **Note**: This running sentinel is redundant in JS but kept for faithfulness
   - JS removes the final running sentinel before returning

3. **Global state**:
   - C modifies global `whites` array and increments global `numwhites`
   - JS creates and returns a new array

4. **ID tracking**:
   - C doesn't track IDs
   - JS assigns unique IDs to each white piece

5. **Logic accuracy**:
   - All white piece positions match exactly
   - All glitch fix positions match exactly
   - Pattern references match exactly

### 4. close_whites() vs closeWhites()

**C function**: Junctions.c:286-322
**JS function**: closeWhites.ts:12-32

#### Key Differences:
1. **Function organization**:
   - C is a single function with nested loops
   - JS splits into 4 functions: setInitialOptimization(), findCloseWallPairs(), processCloseWalls(), updateWallOptimization()

2. **Initial npatch setup**:
   - C initializes npatch array with 0x003F values (lines 293-294)
   - JS doesn't show this initialization - it should be in patchPatterns.ts or oneClose.ts

3. **Wall length calculation**:
   - C stores pre-calculated length in line->length field
   - JS calculates length on-the-fly using Pythagorean theorem in setInitialOptimization()
   - Both use: h2 = length + simpleh2[newtype]

4. **Close wall detection algorithm**:
   - Both use sliding window optimization with firstIdx pointer
   - Both check when line2.startx < x1 + 3 to stop inner loop
   - Exact matching logic: x1 > x2 && y1 > y2 && x1 < x2 + 6 && y1 < y2 + 6

5. **State management**:
   - C calls one_close() which modifies line->h1/h2 directly
   - JS collects updates and applies them immutably at the end

6. **Return values**:
   - C has side effects on global whites array and wall h1/h2 values
   - JS returns new whites array and updated walls

### 5. one_close() vs oneClose()

**C function**: Junctions.c:334-565
**JS function**: oneClose.ts:24-431

#### Key Differences:
1. **Replace vs Add logic**:
   - C uses function pointers to choose between replace_white_2 and add_white_2
   - JS implements both as separate helper functions
   - **CRITICAL DISCREPANCY**: The oneClose README mentions that JS always adds new patches instead of replacing
   - C's replace_white_2 finds whites at exact position with height < ht and replaces
   - JS's replaceWhite2 correctly implements the search logic

2. **Wall length access**:
   - C uses line->length directly
   - JS uses wall1.length property (needs to be pre-calculated)

3. **Fall-through behavior**:
   - C's case 10 falls through to case 11 logic
   - JS correctly implements this with explicit logic for both cases

4. **Helper functions**:
   - C's replace_white() calls replace_white_2 with same x,y for target and new
   - JS implements this inline in cases 6, 7, and 8

5. **State management**:
   - C modifies line->h1/h2 directly
   - JS collects updates in wall1Updates/wall2Updates objects

6. **Whites array management**:
   - C appends to global whites array
   - JS creates new array with all whites (existing + new)

7. **Logic accuracy**:
   - All switch cases match exactly
   - All patch positions and sizes match
   - All h1/h2 update logic matches

### 6. white_hash_merge() vs whiteHashMerge()

**C function**: Junctions.c:569-614
**JS function**: whiteHashMerge.ts:50-115

#### Key Differences:
1. **Global variables**:
   - C uses global `junctions` array and `numjunctions` count
   - JS passes junctions as parameter
   - C uses global `worldwidth` variable
   - JS uses parameter with default value 512

2. **Junction searching**:
   - C uses sliding pointer optimization (j-- and j++ to track position)
   - JS searches entire junction array each time
   - Both require EXACT match (x === wh.x && y === wh.y)

3. **Background pattern values**:
   - Both use backgr1 = 0xaaaaaaaa, backgr2 = 0x55555555
   - Pattern selection: (x + y) & 1 ? backgr2 : backgr1

4. **Bit rotation**:
   - C uses assembly `rol.w #1, back` (16-bit rotate)
   - JS simulates with: `((rotatedBack << 1) | (rotatedBack >>> 15)) & 0xffff`
   - Both rotate 16-bit values

5. **Memory management**:
   - C reuses existing white data if allocated from whitestorage
   - JS always creates new data array

6. **Junction removal**:
   - C shifts all remaining junctions left in array
   - JS uses splice() to remove from array

7. **Logic accuracy**:
   - Hash pattern application formula matches exactly
   - All conditions for applying hash pattern match
   - noCloseWh() logic matches exactly

## Summary of Critical Discrepancies

### Most Important Issues:

1. **Sorting stability (initWhites)**: The white sorting logic differs slightly in how it handles equal x,y coordinates. This could affect the visual appearance when multiple whites overlap.

2. **Replace logic documentation (oneClose)**: The README mentions that JS always adds instead of replacing, but the code correctly implements replacement logic. This documentation should be updated.

3. **Wall length property**: The JS code assumes walls have a pre-calculated `length` property, which needs to be set before calling these functions.

4. **Performance differences**: 
   - JS's junction search in whiteHashMerge is O(n) vs C's optimized sliding pointer
   - JS creates many intermediate arrays for immutability

### Minor/Acceptable Differences:

1. **Function decomposition**: JS splits large functions into smaller, testable units
2. **Immutability**: JS maintains immutability while C modifies in-place
3. **ID tracking**: JS adds IDs for debugging/tracking
4. **Memory management**: JS uses dynamic allocation vs C's pre-allocated arrays
5. **Global state**: JS passes state explicitly vs C's global variables

### Correctness Assessment:

The JavaScript implementation accurately recreates the C logic with only minor differences in implementation details. The core algorithms, calculations, and visual results should match the original, with the exception of the sorting stability issue which needs investigation.
