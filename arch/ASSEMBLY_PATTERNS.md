# Assembly Patterns and Common Pitfalls

This document describes important assembly patterns from the original Continuum code and common pitfalls when converting them to TypeScript.

## SSE Rendering Issues

We discovered multiple issues when converting the SSE (South-South-East) wall rendering code from assembly to TypeScript:

### Issue 1: NEGIFNEG Macro in drawNneline

The NEGIFNEG macro negates a value if a parameter is negative. This was incorrectly interpreted in `drawNneline.ts`.

**Assembly:**
```asm
NEGIFNEG macro val, param
    tst.w param
    bge.s @pos
    neg.w val
@pos
```

**Incorrect TypeScript:**
```typescript
// WRONG: Treats 0 as positive
const rowOffset = dir > 0 ? 64 : -64
```

**Correct TypeScript:**
```typescript
// CORRECT: Treats 0 as non-negative (matches bge.s)
const rowOffset = dir >= 0 ? 64 : -64
```

**Symptom:** Part of the black line stuck off at the wrong angle at the start of the SSE line.

### Issue 2: The DBNE Pattern and Remainder Loops

In the SSE remainder loop, we discovered a subtle bug related to the `dbne` (Decrement and Branch if Not Equal) instruction. This pattern appears in several wall rendering functions and is critical to get right.

### The Assembly Pattern

The original 68000 assembly uses this pattern for remainder loops:

```asm
@loop1  eor.l   D0, (A0)
        subq.w  #1, len
        blt.s   @leave
        eor.l   D1, 64(A0)
        adda.l  D2, A0
        ror.l   #1, D0
        ror.l   #1, D1
        move.l  D0, D3
        move.l  D1, D0
        move.l  D3, D1
        tst.b   D1          ; Test low byte of D1
        dbne    len, @loop1 ; Decrement and branch if not equal (and not -1)
        beq.s   @doend      ; If low byte was 0, jump to end
        
        ; Word wrap happens here only if:
        ; 1. Low byte of D1 is NOT 0 (didn't jump to @doend)
        ; 2. len is still >= 0 after decrementing
        swap    D0
        swap    D1
        addq.w  #2, A0
        dbra    len, @loop1
```

### Key Points

1. **DBNE behavior**: The `dbne` instruction:
   - Decrements the counter first
   - Then branches if the condition is "not equal" AND the counter is not -1
   - This is different from a simple decrement and test

2. **Word wrap condition**: The word wrap (swap and address increment) only happens when:
   - The low byte of D1 is NOT zero (failed the `beq.s @doend` test)
   - AND there are more iterations remaining

### Incorrect TypeScript Translation

The initial incorrect translation looked like this:

```typescript
// INCORRECT - causes horizontal offset
while (remainingLen >= 0) {
  eorToScreen32(newScreen, address, d0)
  if (remainingLen > 0) {
    eorToScreen32(newScreen, address + 64, d1)
  }
  address += 128
  d0 = rotateRight(d0, 1)
  d1 = rotateRight(d1, 1)
  
  // Swap d0 and d1
  const temp = d0
  d0 = d1
  d1 = temp
  
  // WRONG: This checks if low byte IS 0, not if it's NOT 0
  if ((d1 & 0xff) === 0 && remainingLen > 1) {
    d0 = swapWords(d0)
    d1 = swapWords(d1)
    address += 2
  }
  remainingLen -= 2
}
```

### Correct TypeScript Translation

The correct translation that matches the assembly behavior:

```typescript
// CORRECT - matches assembly behavior
while (remainingLen >= 0) {
  eorToScreen32(newScreen, address, d0)
  remainingLen--
  
  if (remainingLen < 0) break
  
  eorToScreen32(newScreen, address + 64, d1)
  address += 128
  d0 = rotateRight(d0, 1)
  d1 = rotateRight(d1, 1)
  
  // Swap d0 and d1
  const temp = d0
  d0 = d1
  d1 = temp
  
  // Check if we need to wrap to next word
  // The assembly uses dbne which decrements first, then checks
  if ((d1 & 0xff) !== 0 && remainingLen > 0) {
    d0 = swapWords(d0)
    d1 = swapWords(d1)
    address += 2
  }
  remainingLen--
}
```

### Files Affected

This pattern appears in multiple wall rendering functions:
- `sseBlack.ts` - Fixed
- Potentially other directional rendering functions (should be audited)

### Symptoms of the Bug

When this pattern is incorrectly translated:
- Lines appear horizontally offset by 2-4 bytes (16-32 pixels)
- The offset typically appears in the middle or towards the end of the line
- Only specific lines are affected (e.g., line 78 in our case)

### Issue 3: Bottom Corruption in southBlack

In `southBlack.ts`, there was an issue with the bottom boundary check that caused corruption at the bottom of vertical lines.

**Incorrect TypeScript:**
```typescript
// WRONG: Allows drawing beyond screen bottom
if (y + len - 1 > VIEWHT) {
  len = VIEWHT - y
}
```

**Correct TypeScript:**
```typescript
// CORRECT: Properly limits to screen height
if (y + len > VIEWHT) {
  len = VIEWHT - y
}
```

**Symptom:** Corruption or wrapping at the bottom of vertical walls.

## General Patterns to Watch For

### 1. Boundary Condition Off-by-One Errors
- Assembly often uses different conventions for inclusive/exclusive bounds
- Pay attention to `>` vs `>=` and whether lengths include the starting position

### 2. Macro Behavior
- Macros like NEGIFNEG have specific behavior for edge cases (like 0)
- Always check the actual assembly implementation, not just the macro name

### 3. Complex Loop Flow Control
- Assembly loops often have multiple exit conditions and complex branching
- The order of operations (test, decrement, branch) matters
- Conditional operations after loop tests need careful translation

### 4. Word Alignment and Address Arithmetic
- 68000 assembly often works with word-aligned addresses
- Address increments of 2 or 4 bytes are common and must be preserved exactly

## How to Identify These Issues

Look for:
1. Remainder loops that process 2 items per iteration
2. Use of `dbne` or similar decrement-and-branch instructions
3. Conditional word wrapping based on low byte tests
4. Complex flow control with multiple exit conditions
5. Boundary checks near screen edges
6. Macros that test for negative/positive values

## Testing Strategies

To test for these issues:
1. Render individual lines and check for horizontal alignment
2. Pay special attention to lines that end in remainder sections
3. Look for shifts of exactly 2 or 4 bytes (16 or 32 pixels)
4. Test lines that touch screen boundaries
5. Test with direction parameters of 0, positive, and negative values
6. Create minimal test cases that isolate specific rendering functions