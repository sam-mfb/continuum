# NE Black Rendering Offset Issues Analysis

## Problem Description
The TypeScript translation of `neBlack()` has rendering issues where lower sections are improperly offset, suggesting problems with word boundary handling and/or rotation logic.

## Key Discrepancies Found

### 1. **Carry Flag Handling (Critical)**
**Original Assembly (line 293):**
```asm
dbcs len, @loop1
```
- Decrements and branches if carry is **set**

**TypeScript Implementation (line 157):**
```typescript
if ((rotatedEor & 0x80000000) === 0)
```
- Checks if high bit is **clear**

**Issue:** This is inverted logic! The carry flag is set when a 1 bit rotates out during `ror.l #1, eor`. The TypeScript should check if the bit is set, not clear.

### 2. **Word Swap After Main Loop**
**Original Assembly (lines 298-302):**
```asm
tst.b eor
beq.s @1
subq.w #2, screen
bra.s @doend
@1 swap eor
```
- Tests the low **byte** to determine whether to swap

**TypeScript Implementation (line 176):**
```typescript
if ((rotatedEor & 0xff) === 0)
```

**Issue:** The condition logic might be correct but the subsequent operations differ in timing.

### 3. **Address Increment Timing**
**Original:** Adds 2 to screen address **after** swapping the word
**TypeScript:** Adds 2 to address **before** the break statement

**Issue:** This affects the address used for subsequent operations.

### 4. **End Section Shift Operation**
**Original Assembly (line 309):**
```asm
lsr.w #1, eor
```
- Shifts the eor value itself in each iteration

**TypeScript Implementation (line 191):**
```typescript
(eor16 >>> i)
```
- Pre-calculates all shifts from the original value

**Issue:** The TypeScript version shifts from the original value each time rather than progressively shifting.

### 5. **Loop Structure Differences**
The original uses a single loop with conditional branching, while the TypeScript splits it into two separate while loops. This could cause state inconsistencies if the carry/swap logic isn't handled correctly between loops.

## Root Cause Analysis
The most likely cause of the lower section offset issues is the **inverted carry flag check** combined with incorrect state management between the split loops. This would cause:

1. Incorrect word boundary transitions
2. Misaligned patterns after rotations
3. Offset errors accumulating in lower screen sections

## Recommended Fix Priority
1. Fix the carry flag check (line 157) - invert the condition
2. Verify the end section shift logic matches progressive shifting
3. Review the loop split and ensure state is properly maintained
4. Test with various line positions to verify word boundary handling

## Impact
These issues would be most noticeable in areas where:
- Lines cross word boundaries frequently
- Multiple rotations occur
- Lower screen sections where accumulated errors become visible