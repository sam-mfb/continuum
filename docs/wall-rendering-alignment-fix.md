# Wall Rendering Alignment Fix

## Problem Description

The wall rendering system was displaying walls and their associated white patches at incorrect horizontal positions. Specifically:

1. **Black walls** were appearing 8 pixels to the left of their intended position
2. **White patches** (endpoint decorations) were appearing at a different horizontal offset than the walls they belonged to

This created a visual mismatch where the white patches didn't align with their associated walls.

## Root Cause

The original 68000 assembly code uses a consistent memory addressing scheme across all drawing functions:

```assembly
FIND_WADDRESS(x,y)  // Macro that calculates screen address
```

This macro performs a critical operation:
```assembly
move.w  thex, D0
asr.w   #3, D0       // Divide x by 8 to get byte position
bclr.l  #0, D0       // Clear bit 0 - forces 16-bit (word) alignment
```

The `bclr.l #0, D0` instruction clears the least significant bit, effectively performing `(x >> 3) & 0xfffe`. This aligns all memory accesses to 16-bit word boundaries, which was an optimization for the 68000 processor.

## The JavaScript Implementation Error

### Initial Implementation

Our JavaScript code had inconsistent address calculations:

1. **In `southBlack.ts`** (black wall drawing):
   ```typescript
   const byteX = (x >> 3) & 0xfffe  // Correctly mimicked the assembly
   ```

2. **In `whiteWallPiece.ts` and `eorWallPiece.ts`** (white patch drawing):
   ```typescript
   const byteX = Math.floor(x / 8)  // Missing the 16-bit alignment!
   ```

This inconsistency meant:
- Black walls were drawn at 16-bit aligned positions (e.g., x=192 for a wall at x=200)
- White patches were drawn at exact byte positions (e.g., x=200)
- This created an 8-pixel horizontal offset between elements that should align

### Why This Happened

The JavaScript port incorrectly assumed that `Math.floor(x / 8)` was sufficient for byte addressing. However, the original assembly's `FIND_WADDRESS` macro consistently applies 16-bit alignment across ALL drawing functions, not just some of them.

## The Fix

The solution was to ensure all drawing functions use the same address calculation:

### Updated `whiteWallPiece.ts`:
```typescript
// FIND_WADDRESS equivalent - align to 16-bit boundary
const byteX = (x >> 3) & 0xfffe // Same as southBlack
```

### Updated `eorWallPiece.ts`:
```typescript
// FIND_WADDRESS equivalent - align to 16-bit boundary
const byteX = (x >> 3) & 0xfffe // Same as southBlack and whiteWallPiece
```

## Technical Details

### Why 16-bit Alignment?

The 68000 processor could access memory more efficiently when reading/writing 16-bit or 32-bit values at even addresses. The original game optimized for this by:

1. Aligning all graphics operations to 16-bit boundaries
2. Using different drawing modes based on the sub-word position:
   - **Normal mode**: 32-bit operations for most positions
   - **Quick mode 1**: For negative x coordinates
   - **Quick mode 2**: For positions where `(x & 15) <= 6` or near the right edge

3. Compensating for the alignment by shifting bit patterns to the correct position within the aligned word

### The Shift Compensation

When drawing at x=200:
- Byte position would naturally be 25 (200 ÷ 8)
- 16-bit alignment forces it to byte 24 (covers pixels 192-223)
- The pattern is shifted right by 8 bits (x & 15) to position it correctly
- The wall appears at the correct position despite starting from an aligned address

## Lessons Learned

1. **Consistency is crucial**: When porting assembly code, ensure that address calculation methods are consistent across all related functions
2. **Understand the optimization**: The 16-bit alignment wasn't arbitrary - it was a performance optimization that affected the entire rendering system
3. **Test with visual debugging**: Creating visual representations of the bitmap data was essential for identifying the misalignment
4. **Read the macros**: Assembly macros like `FIND_WADDRESS` contain critical implementation details that must be preserved in ports