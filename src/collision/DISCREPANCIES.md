# Discrepancies in `checkFigure.ts` Implementation

This document outlines significant discrepancies between the original 68k assembly implementation of `check_figure` in `Draw.c` and the modern TypeScript version in `checkFigure.ts`. These errors are subtle and stem from the nuances of 68k bitwise operations versus their JavaScript counterparts.

## 1. Incorrect Overflow Calculation

The most critical error is in the calculation of `overflowData`, which represents the portion of the sprite that spills into the next 16-bit word on the screen when the sprite is not aligned to a 16-pixel boundary.

### Original Assembly (`Draw.c:261-263`)

The 68k assembly code correctly isolates the bits from the **lower 16-bit half** of the sprite that spill over.

```asm
move.w	D0, D1      ; Copy LOW 16 bits of 32-bit sprite data (D0) to D1
lsr.l	x, D0       ; Shift full 32-bit sprite data right (for main check)
lsl.w	D2, D1      ; Shift the original LOW 16 bits in D1 left to get the overflow
```

The key is `lsl.w D2, D1`. This is a 16-bit left shift operating only on the lower word of the original sprite data.

### TypeScript Implementation (`checkFigure.ts:60`)

The TypeScript code attempts to replicate this but performs a different operation entirely.

```typescript
const overflowData = (spriteData << (16 - bitShift)) >>> 16;
```

This logic is flawed because it shifts the **entire 32-bit** `spriteData` left. The result is that bits from the *upper* 16 bits of the sprite data are incorrectly included in the overflow calculation, leading to incorrect collision results when a sprite crosses a 16-pixel boundary.

## 2. Incorrect Masking of Overflow Data

The check against the dithered background pattern is applied incorrectly to the calculated `overflowData`.

### Original Assembly (`Draw.c:264`)

The assembly performs a 16-bit `AND` operation between the 16-bit `overflowData` (register `D1`) and the `back` register.

```asm
and.w	back, D1
```

Because this is a 16-bit operation (`and.w`), it only uses the **lower 16 bits** of the 32-bit `back` register for the mask.

### TypeScript Implementation (`checkFigure.ts:63`)

The TypeScript code performs a 32-bit `AND` operation, using the entire `backgroundMask`.

```typescript
const maskedOverflow = overflowData & (backgroundMask >>> 0);
```

This is incorrect because it applies a 32-bit mask to a 16-bit value. While `overflowData` should only contain 16 significant bits, using the full 32-bit `backgroundMask` can lead to unexpected behavior if the upper bits of the mask are not zero. The operation should explicitly use only the lower 16 bits of the mask to match the original's behavior.

**Correct Implementation:**
```typescript
const maskedOverflow = overflowData & (backgroundMask & 0xFFFF);
```
