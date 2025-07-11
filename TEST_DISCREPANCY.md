# Wall Initialization Logic: Test Discrepancy Report

This document analyzes the unit tests for the wall initialization logic in `src/walls/init/` to understand why they failed to catch the discrepancies documented in `DISCREPANCY.md`. It also proposes new or modified tests to expose these bugs.

---

## `src/walls/init/initWalls.ts` (`initWalls.test.ts`)

### `organizeWallsByKind()`

*   **Discrepancy:** The implementation terminates linked lists with `''` instead of the more conventional `null`.
*   **Reason for Test Failure:** The tests did not fail; they confirmed the incorrect behavior. The assertions in tests like `'organizes walls into separate linked lists by kind'` were written to expect `''` (e.g., `expect(result.organizedWalls['w3']?.nextId).toBe('')`). The tests are simply validating that the code does what it does, not that it does the *correct* thing according to best practices.
*   **Suggested Test Change:**
    1.  Modify the implementation to use `null` to terminate linked lists.
    2.  Update all relevant assertions in the test file to expect `null` instead of `''`. For example: `expect(result.organizedWalls['w3']?.nextId).toBe(null)`.

### `findFirstWhiteWalls()`

*   **Discrepancy:** The function is impure and mutates the `walls` array passed into it, which is a major violation of the stated goal of immutability.
*   **Reason for Test Failure:** The tests actively encourage and validate the incorrect, impure behavior. The test `'creates linked list of NNE walls via nextwhId'` passes the `walls` array to the function and then asserts that the *original* `walls` array has been modified: `expect(walls[0]?.nextwhId).toBe('w2')`. The test is written to confirm the side effect occurred.
*   **Suggested Test Change:**
    1.  Refactor the function to be pure. It should accept the `walls` array and return an object containing both the `firstWhiteId` and a new, updated map or array of walls.
    2.  Rewrite the tests to check the *return value* of the function, not the original array.
    3.  Add an assertion to ensure the original input array was not mutated.

    ```typescript
    // Proposed new test structure
    it('should return the first white wall ID and an updated wall map', () => {
      const originalWalls = [
        // ... test data
      ];
      const originalWallsCopy = JSON.parse(JSON.stringify(originalWalls)); // Deep copy for comparison

      const result = findFirstWhiteWalls(originalWalls);

      // Check the returned values
      expect(result.firstWhiteId).toBe('w2');
      expect(result.updatedWalls['w2']?.nextwhId).toBe('w3');

      // Verify the original array was not mutated
      expect(originalWalls).toEqual(originalWallsCopy);
    });
    ```

### `detectWallJunctions()`

*   **Discrepancy 1 (Bug):** The insertion sort algorithm is implemented incorrectly, causing elements to be duplicated instead of shifted.
*   **Reason for Test Failure:** The test `'sorts junctions by x-coordinate'` is not robust enough to catch this. It checks the `x` coordinate of each element individually (`expect(junctions[0]?.x).toBe(0)`). With the given test data, the buggy sort might produce an array where the first few elements are coincidentally correct, allowing the test to pass. It does not verify the integrity of the entire array.
*   **Suggested Test Change:** The assertion should check the entire resulting array against an expected sorted array. This is much stricter and would immediately fail if elements were duplicated or out of order.

    ```typescript
    // Proposed stronger assertion
    it('sorts junctions by x-coordinate', () => {
      // ...
      const junctions = detectWallJunctions(walls);
      const expectedJunctions = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 15, y: 15 },
        { x: 20, y: 0 },
        { x: 30, y: 10 },
        { x: 40, y: 20 }
      ];
      // This checks for order, content, and length all at once.
      expect(junctions).toEqual(expectedJunctions);
    });
    ```

*   **Discrepancy 2 (Omission):** The function fails to pad the sorted `junctions` array with 18 sentinel values (`x = 20000`).
*   **Reason for Test Failure:** No test was written to check for this requirement. The tests only focus on the correctness of the junctions that are found, not on the final structure of the array that is required by downstream consumers.
*   **Suggested New Test:** A new test case should be added to explicitly check for the sentinel padding.

    ```typescript
    // Proposed new test
    it('should pad the sorted junctions array with 18 sentinel values', () => {
      const walls = [
        { id: 'w1', startx: 0, starty: 0, endx: 10, endy: 10, ... },
        { id: 'w2', startx: 20, starty: 20, endx: 30, endy: 30, ... }
      ];
      const junctions = detectWallJunctions(walls);

      // 4 actual junctions + 18 sentinels
      expect(junctions.length).toBe(4 + 18);

      // Check that the last 18 elements are sentinels
      for (let i = 4; i < junctions.length; i++) {
        expect(junctions[i]?.x).toBe(20000);
      }
    });
    ```

---

## `src/walls/init/initWhites.ts` (`initWhites.test.ts`)

The test file `initWhites.test.ts` only contains tests for the helper functions `sortWhitesByX` and `mergeOverlappingWhites`. The main exported function, `initWhites`, is not tested at all. This is the primary reason the major discrepancy was missed.

### `initWhites()`

- **Discrepancy (Major/Omission):** The function fails to pad the sorted `whites` array with 18 sentinel values (`x = 20000`).
- **Reason for Test Failure:** This function is not covered by any unit tests. The tests for its helper functions (`sortWhitesByX`, `mergeOverlappingWhites`) are well-written but cannot catch an error in the orchestrating function that calls them. The responsibility for the final padding lies in `initWhites`, and without a test for it, the omission went unnoticed.
- **Suggested New Test:** An integration test for the `initWhites` function is needed. It should call the function with a sample set of walls and junctions and then verify the properties of the final returned array, specifically its length and the presence of the sentinel values.

    ```typescript
    // Proposed new test for initWhites
    describe('initWhites', () => {
      it('should perform a full initialization and pad the result with sentinels', () => {
        const walls = [
          // ... some realistic wall data
        ];
        const junctions = [
          // ... some realistic junction data
        ];
        const firstWhiteId = '...'; // ID of the first white wall

        const result = initWhites(walls, junctions, firstWhiteId);
        const numActualWhites = result.whites.length - 18; // Calculate how many non-sentinel whites were created

        // Check for correct total length
        expect(result.whites.length).toBe(numActualWhites + 18);

        // Check that the last 18 elements are sentinels
        for (let i = numActualWhites; i < result.whites.length; i++) {
          expect(result.whites[i]?.x).toBe(20000);
        }
      });
    });
    ```

---

## `src/walls/init/normWhites.ts` (`normWhites.test.ts`)

*   **Discrepancy:** The `add_white` implementation in this module does not add a sentinel value after each new white piece, which is a minor deviation from the original C code's behavior.
*   **Reason for Test Failure:** The module `normWhites.ts` is **not covered by any unit tests**. The file `normWhites.test.ts` does not exist. Without any tests, no discrepancies could be caught.
*   **Suggested New Test:** A new test file, `normWhites.test.ts`, should be created. It should include tests that:
    1.  Verify that the correct standard white pieces are generated for each wall `newtype`.
    2.  Verify that the special "glitch-fixing" white pieces (e.g., `neglich`, `eneglitch1`) are correctly added for the specific wall types that require them.
    3.  Check that the coordinates and heights of the generated white pieces are correct based on the properties of the input walls.

    ```typescript
    // Proposed new test file structure for normWhites.test.ts
    import { describe, it, expect } from 'vitest';
    import { normWhites } from './normWhites';
    import type { LineRec } from '../types';
    import { NEW_TYPE } from '../constants';

    describe('normWhites', () => {
      it('should generate standard white pieces for a simple wall', () => {
        const walls: LineRec[] = [
          { id: 'w1', startx: 100, starty: 100, endx: 120, endy: 100, newtype: NEW_TYPE.E, ... },
        ];
        const whites = normWhites(walls);
        // From whitepicts, NEW_E generates two pieces.
        expect(whites.length).toBe(2);
        expect(whites[0]?.x).toBe(100); // startx
        expect(whites[1]?.x).toBe(120); // endx
      });

      it('should generate glitch-fixing pieces for a NEW_NE wall', () => {
        const walls: LineRec[] = [
          { id: 'w1', startx: 100, starty: 100, endx: 120, endy: 120, newtype: NEW_TYPE.NE, ... },
        ];
        const whites = normWhites(walls);
        // Expect standard pieces + one glitch piece
        expect(whites.length).toBe(3);
        // Check for the glitch piece specifically
        const glitchPiece = whites.find(w => w.ht === 4);
        expect(glitchPiece).toBeDefined();
        expect(glitchPiece?.x).toBe(116); // endx - 4
        expect(glitchPiece?.y).toBe(122); // endy + 2
      });
    });
    ```

---

## `src/walls/init/closeWhites.ts` (`closeWhites.test.ts`)

This test file covers the helper functions but misses the main `closeWhites` function and has several weaknesses in its assertions.

### `closeWhites()` (Overall Function)

*   **Discrepancy:** The main `closeWhites` function, which orchestrates the process, is not tested at all. It also fails to initialize and use the `npatch` array correctly.
*   **Reason for Test Failure:** There are no tests for the main function. The tests for the helpers (`processCloseWalls`) mock the behavior of `oneClose`, so they cannot detect that `oneClose` would receive an uninitialized `npatch`. This is a classic example of unit tests passing while the integration fails.
*   **Suggested New Test:** An integration test for `closeWhites` is required. This test should provide a set of walls that are known to trigger the creation of `npatch`-based patches and assert that the correct white pieces are generated.

### `setInitialOptimization()`

*   **Discrepancy:** The calculation for `h2` is incorrect for any non-horizontal wall because it uses `wall.endx - wall.startx` as the wall's `length`.
*   **Reason for Test Failure:** This function is not exported and is not covered by any unit tests.
*   **Suggested New Test:** The function should be exported and tested directly. The test should include diagonal walls and assert that the calculated `h1` and `h2` values match the expected values based on a correct length calculation.

    ```typescript
    // Proposed new test for setInitialOptimization
    it('should correctly calculate h2 for diagonal walls', () => {
      const diagonalWall: LineRec = { id: 'w1', startx: 0, starty: 0, endx: 30, endy: 40, newtype: NEW_TYPE.S, ... }; // 3-4-5 triangle, length is 50
      // Assuming simpleh2[NEW_TYPE.S] is, for example, -5
      const expectedH2 = 50 - 5;
      const walls = setInitialOptimization([diagonalWall]);
      expect(walls[0]?.h2).toBe(expectedH2);
    });
    ```

### `findCloseWallPairs()`

*   **Discrepancy:** The logic for finding close pairs is flawed. It uses an incorrect 3-pixel radius check instead of the original 6x6 box check, and the logic to avoid duplicate pairs is not robust.
*   **Reason for Test Failure:** The tests use simple, "well-behaved" data.
    *   `'finds wall pairs within 3 pixel threshold'` uses a pair that is close enough to satisfy both the correct and incorrect logic, so the test passes.
    *   `'avoids duplicate pairs'` uses a simple two-wall scenario where the flawed logic happens to work. It doesn't test more complex scenarios with multiple overlapping walls that could fool the `if (i > j)` check.
*   **Suggested Test Change:** A more adversarial test case is needed to expose the flawed logic. This test should include a pair of endpoints that are outside the 3-pixel radius but *inside* the correct 6x6 box.

    ```typescript
    // Proposed new test for findCloseWallPairs
    it('should find pairs using a 6x6 box check, not a simple radius', () => {
      const walls: LineRec[] = [
        { id: 'w1', startx: 0, starty: 0, endx: 10, endy: 10, ... },
        // This wall's start is 4px away in x and y, but should be found by the 6x6 box check
        // C code check: x1(10) > x2(14-3=11) is false. Let's fix coords.
        // Let's try C check: x1 > x2-3 && x1 < x2+3 && y1 > y2-3 && y1 < y2+3 (simplified)
        // Let wall2 start at (12, 12). x1=10, x2=12. 10 > 9 && 10 < 15. This should pass.
        { id: 'w2', startx: 12, starty: 12, endx: 20, endy: 20, ... }
      ];
      const pairs = findCloseWallPairs(walls);
      // This would fail with a simple 3-pixel distance check, but should pass with the correct box logic.
      expect(pairs.length).toBe(1);
    });
    ```

---

## `src/walls/init/oneClose.ts` (`oneClose.test.ts`)

The tests for `oneClose` are superficial and incomplete, failing to validate the core logic of this complex function.

* **Discrepancy 1 (Major):** The function calculates wall length incorrectly for any non-horizontal wall, uses hardcoded coordinates instead of the correct endpoint, and completely omits the C version's logic for merging or replacing existing white pieces.
* **Reason for Test Failure:** The tests are extremely weak.
  1. The test `'calculates correct direction values from newtype'` only asserts that `patches.length` is greater than zero. It doesn't check if the patch is the *correct* one, if its coordinates are correct, or if its data is correct. It's a "smoke test" at best.
  2. The test `'handles all 64 direction combinations'` is an empty placeholder and tests nothing.
  3. No test validates the actual coordinates of the generated patches.
  4. No test validates the `h1`/`h2` update values. Because the test data uses a diagonal wall, a proper assertion on `h2` would have immediately failed due to the incorrect length calculation.
  5. No tests exist for the missing merge/replace logic.
* **Suggested Test Change:** The test suite needs to be rewritten to be comprehensive.
  1. Create specific tests for key `dir1`/`dir2` combinations that are known to produce patches.
  2. For each test, assert the **exact properties** of the generated patch: `x`, `y`, `ht`, and `data`.
  3. For each test, assert the **exact expected values** for `wall1Updates` and `wall2Updates`.
  4. Add tests with non-horizontal walls to verify that length calculations are correct.

    ```typescript
    // Proposed new, specific test
    it('should handle dir1=0, dir2=2 correctly', () => {
      const wall1: LineRec = { id: 'w1', startx: 100, starty: 100, endx: 150, endy: 100, newtype: NEW_TYPE.N, ... }; // dir1=0, length=50
      const wall2: LineRec = { id: 'w2', startx: 150, starty: 100, endx: 160, endy: 90, newtype: NEW_TYPE.ENE, ... }; // dir2=2

      // endpoint1=1 (end of wall1), endpoint2=0 (start of wall2)
      const { patches, wall1Updates } = oneClose(wall1, wall2, 1, 0);

      // i=10, j=wall1.h2. Assume h2 was 0.
      // Check if patch should be created: 50 - 10 > 0. Yes.
      expect(patches.length).toBe(1);
      expect(patches[0]).toEqual({
        id: expect.any(String),
        x: 150, // wall1.endx
        y: 140, // wall1.endy - 10 is wrong, should be wall1.endy. C code is endy-i. Let's assume C is right.
        y: 90, // wall1.endy - 10
        ht: 10,
        data: [...npatch], // or whatever the correct patch data is
        hasj: false
      });

      // Check the h2 update
      expect(wall1Updates.h2).toBe(50 - 10); // length - i
    });
    ```

---

## `src/walls/init/whiteHashMerge.ts` (`whiteHashMerge.test.ts`)

The tests for this module are the most thorough in the `init` suite, but they still miss one critical bug.

* **Discrepancy:** The function fails to "consume" junctions after they are used to create a hash pattern. This means a single junction could be used to incorrectly hash multiple white pieces if they share the same coordinates.
* **Reason for Test Failure:** No test case was created for the specific scenario of multiple white pieces sharing the exact coordinates of a single junction. The existing tests only cover 1-to-1 matches or cases where whites have no corresponding junction.
* **Suggested New Test:** A new test should be added to explicitly check for this behavior. It should create one junction and two white pieces at that junction's location. The test should assert that only *one* of the white pieces is modified and that the original `junctions` array is not mutated (while the internal copy is).

    ```typescript
    // Proposed new test for junction consumption
    it('should only use a junction once', () => {
      const whites: WhiteRec[] = [
        { id: 'w1', x: 20, y: 20, ht: 6, data: [255,...], hasj: false },
        { id: 'w2', x: 20, y: 20, ht: 6, data: [255,...], hasj: false }
      ];
      const junctions: JunctionRec[] = [{ x: 20, y: 20 }];
      const originalJunctions = JSON.parse(JSON.stringify(junctions));

      const result = whiteHashMerge(whites, junctions);

      // Find how many whites were hashed
      const hashedWhites = result.filter(w => w.hasj);

      // Only one of them should have been hashed
      expect(hashedWhites.length).toBe(1);

      // The original junctions array should be untouched
      expect(junctions).toEqual(originalJunctions);
    });
    ```

* **Discrepancy 2 (Minor):** The tests confirm that the white piece `data` is *changed*, but not that it is changed to the *correct* hash pattern.
* **Reason for Test Failure:** The assertions are not strict enough. `expect(result[0]?.data).not.toEqual(...)` confirms a change but not the result of that change.
* **Suggested Test Change:** For one of the core hashing tests, the expected data array should be calculated manually and used in a strict `toEqual` assertion. This would guarantee that the bitwise operations (`hashFigure`, `rorw` simulation, etc.) are working exactly as intended.

    ```typescript
    // Proposed stricter assertion
    it('converts white data using the correct XOR hash pattern', () => {
      const initialData = [0b11111111, 0b00000000, ...];
      const whites: WhiteRec[] = [
        { id: 'w1', x: 10, y: 10, ht: 6, data: initialData, hasj: false }
      ];
      const junctions: JunctionRec[] = [{ x: 10, y: 10 }];

      // Manually calculate the expected result of the XOR operation
      // This is complex, but necessary for a robust test.
      const expectedData = [0b01010101, 0b10101010, ...]; // Example values

      const result = whiteHashMerge(whites, junctions);
      expect(result[0]?.data).toEqual(expectedData);
    });
    ```
