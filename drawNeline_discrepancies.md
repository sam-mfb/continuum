# drawNeline Implementation Discrepancies

This document lists functional differences between the TypeScript port `drawNeline` and the original C/68K assembly `draw_neline()` in `Draw.c`.

1. **Missing vertical-edge clipping**  
   The original code adjusts `len` when the line would overwrite the top or bottom of the screen (checks `dir==L_DN && y+(len>>1)>=SCRHT-1` or `dir==L_UP && y-(len>>1)<=SBARHT`). The TS version omits any y-boundary clipping.

2. **Rotate and mask-width mismatches**  
   In the original’s post-loop, pixel chips are manipulated by byte-wide shifts and masks (`move.b #0xC0, D0`; `ror.b #1, D0`; `rol.b #8, D0`). The TS code uses word-wide operations (`move_w`, `ror_w`, `rol_w`) on D0, which changes how bits rotate across byte boundaries.

3. **Branch-and-count differences in the diagonal loops**  
   The original uses `DBCS`/`DBCC` (branch on carry clear/set) against D3 to handle up vs down and carry-based loop control. The TS port replaces these with a generic `dbra`/`dbf` on D4 (or D3 in some loops), losing the original carry-based branching semantics.

4. **Simplified post-loop logic**  
   The original has a two-phase `dbcs…subq…blt` integration with a final `or.b` after crossing byte boundaries. The port flattens this into a single `while(true)` carry-check loop, omitting the precise sequence of byte-boundary writes and two-phase rotation/branch.

5. **Ordering of the `len < 0` test**  
   The TS code checks `len < 0` immediately after the boundary‐check AND before most register setup, while the original defers this `BLT @leave` until after the initial `JSR_BADDRESS` and `ANDI` prologue. This is a minor ordering change in register setup.

---

*Note:* There are also smaller differences (use of `JSR_BADDRESS` vs `JSR_WADDRESS`, deep-cloning the bitmap, etc.), but the above are the primary functional discrepancies.
