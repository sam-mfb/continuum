# Assembly Patterns and Common Pitfalls

This document describes important assembly patterns from the original Continuum code and common pitfalls when converting them to TypeScript.

## Rendering Issues

### Issue 1: NEGIFNEG Macro

**Assembly:**

```asm
NEGIFNEG macro val, param
    tst.w param
    bge.s @pos
    neg.w val
@pos
```

### Issue 2: The DBNE Pattern and Remainder Loops

A subtle bug related to the `dbne` (Decrement and Branch if Not Equal) instruction. This pattern appears in several wall rendering functions and is critical to get right.

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

