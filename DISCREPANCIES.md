Based on a careful comparison between the TypeScript files and the original `Play.c` source code, here is a list of discrepancies.

A general observation is that the original 68k assembly code performs calculations that result in 32-bit numbers (from `muls`) but then uses 16-bit operations (`add.w`, `cmp.w`) on those results. This truncates the values, leading to a significant loss of precision that is only valid for small inputs. The TypeScript code attempts to emulate this, but there are key differences.

### Discrepanices in `src/shots/xyindist.ts`

1.  **Incorrect Calculation of `dist²`**:
    *   **Original ASM**: The code calculates `dist²` by first negating `dist` (`neg.w D0`) and then performing a signed multiplication (`muls D0, D0`). The result of `(-dist) * (-dist)` is correctly `dist²`.
    *   **TypeScript**: The code emulates this as `asm.D0 = -asm.D0 & 0xffff` followed by `asm.D0 = asm.D0 * asm.D0`. The `& 0xffff` mask effectively treats the negated value as a 16-bit *unsigned* integer. Squaring this masked value does not produce the same result as the original signed multiplication, especially for larger `dist` values.

2.  **Incorrect Signed vs. Unsigned Comparison**:
    *   **Original ASM**: The comparison `cmp.w D0, D1` followed by `bgt.s @false` performs a *signed* 16-bit comparison between the lower words of `x² + y²` and `dist²`.
    *   **TypeScript**: The comparison `if (asm.D1 > (asm.D0 & 0xffff))` performs an *unsigned* comparison. The values being compared have been forced into the positive number space by the `& 0xffff` mask on the addition and the flawed squaring of `dist`. This will produce different results than the original code whenever the 16-bit values could be interpreted as negative (i.e., when the most significant bit is 1).

### Discrepancies in `src/shots/xyindistance.ts`

1.  **Incorrect Signed vs. Unsigned Comparison**:
    *   **Original ASM**: The comparison `cmp.w D2, D1` followed by `bgt.s @false` performs a *signed* 16-bit comparison between the lower words of `x² + y²` and `dist²`.
    *   **TypeScript**: The comparison `if (asm.D1 > (asm.D2 & 0xffff))` performs an *unsigned* comparison for the same reasons outlined above. This is the primary discrepancy in this function.
