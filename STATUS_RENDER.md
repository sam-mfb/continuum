# Status Bar Rendering Implementation Plan

## Overview

The status bar rendering system in the original Continuum game consists of several layers of functions that work together to display and update game information. These functions need to be implemented in TypeScript following the established patterns in the codebase.

## Status Bar Template Management

The status bar template (from rsrc_259.bin) should be loaded and managed by the sprite service, similar to how ship and other sprites are handled. This ensures it's always available and properly initialized.

### Sprite Service Updates Required

```typescript
// In SpriteServiceV2 interface
getStatusBarTemplate(): MonochromeBitmap

// The service will:
// 1. Load rsrc_259.bin during initialization
// 2. Decompress using expandTitlePage(data, 24)
// 3. Store as a MonochromeBitmap for easy access
```

## Function Hierarchy

### Low-Level (Already Implemented)

- ✅ `drawDigit` - Draws a single digit/character at a position
- ✅ `sbarClear` - Clears/resets the status bar to template

### Mid-Level (To Implement)

- `writeInt` - Writes an integer right-aligned at a position
- `writeLong` - Writes a long integer right-aligned at a position
- `writeStr` - Writes a string (A-Z characters) at a position

### High-Level (To Implement)

- `writeFuel` - Updates fuel display at specific position
- `writeScore` - Updates score display at specific position
- `writeBonus` - Updates bonus display at specific position
- `writeLives` - Draws ship icons for remaining lives
- `writeLevel` - Updates level number display
- `writeMessage` - Displays text messages in message area

### Complete Rendering Functions (To Implement)

- `newSbar` - Complete status bar redraw
- `updateSbar` - Incremental status bar update

## Position Constants

All positions should be defined in `src/status/constants.ts`:

```typescript
// src/status/constants.ts

// Top row (y=0) positions
export const LIVES_START_X = 8
export const LIVES_Y = 0
export const LIVES_SPACING = 8

// Bottom row (y=12) positions
export const MESSAGE_X = 8
export const MESSAGE_Y = 12
export const FUEL_X = 296
export const FUEL_Y = 12
export const BONUS_X = 384
export const BONUS_Y = 12
export const LEVEL_X = 456
export const LEVEL_Y = 12

// Score position varies based on value
export const SCORE_Y = 12
export const SCORE_X_NORMAL = 216 // For scores < 1,000,000
export const SCORE_X_LARGE = 224 // For scores >= 1,000,000
```

## Implementation Details

### 1. `writeInt.ts`

```typescript
// src/status/render/writeInt.ts
// Corresponds to writeint() in orig/Sources/Play.c:1051-1075

export function writeInt(deps: {
  x: number
  y: number
  value: number
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap
```

- Writes integer right-aligned at position
- Converts number to digits and draws right-to-left
- Clears leftmost position with SPACECHAR to handle shrinking numbers

### 2. `writeLong.ts`

```typescript
// src/status/render/writeLong.ts
// Corresponds to writelong() in orig/Sources/Play.c:1037-1048

export function writeLong(deps: {
  x: number
  y: number
  value: number
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap
```

- Similar to writeInt but handles larger numbers
- Writes long integer right-aligned

### 3. `writeStr.ts`

```typescript
// src/status/render/writeStr.ts
// Corresponds to writestr() in orig/Sources/Play.c:1078-1092

export function writeStr(deps: {
  x: number
  y: number
  text: string
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap
```

- Writes uppercase text left-to-right
- Converts A-Z to appropriate digit indices (A = ACHAR = 10)
- Skips non-alphabetic characters

### 4. Position-Specific Writers

#### `writeFuel.ts`

```typescript
export function writeFuel(deps: {
  fuel: number
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap
```

- Uses FUEL_X and FUEL_Y constants
- Gets statusBarTemplate from spriteService.getStatusBarTemplate()
- Calls writeInt internally

#### `writeScore.ts`

```typescript
export function writeScore(deps: {
  score: number
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap
```

- Uses SCORE_X_NORMAL or SCORE_X_LARGE based on value
- Gets statusBarTemplate from spriteService.getStatusBarTemplate()
- Calls writeLong internally

#### `writeBonus.ts`

```typescript
export function writeBonus(deps: {
  bonus: number
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap
```

- Uses BONUS_X and BONUS_Y constants
- Gets statusBarTemplate from spriteService.getStatusBarTemplate()
- Calls writeInt internally

#### `writeLives.ts`

```typescript
export function writeLives(deps: {
  lives: number
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap
```

- Uses LIVES_START_X, LIVES_Y, and LIVES_SPACING constants
- Gets statusBarTemplate from spriteService.getStatusBarTemplate()
- Draws SHIPCHAR sprites with proper spacing
- Maximum display area allows ~18 ships

#### `writeLevel.ts`

```typescript
export function writeLevel(deps: {
  level: number
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap
```

- Uses LEVEL_X and LEVEL_Y constants
- Gets statusBarTemplate from spriteService.getStatusBarTemplate()
- Calls writeInt internally

#### `writeMessage.ts`

```typescript
export function writeMessage(deps: {
  message: string | null
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap
```

- Uses MESSAGE_X and MESSAGE_Y constants
- Gets statusBarTemplate from spriteService.getStatusBarTemplate()
- Displays messages like "FUEL CRITICAL", "MISSION COMPLETE"
- Calls writeStr internally

### 5. Complete Status Bar Functions

#### `newSbar.ts`

```typescript
// Corresponds to new_sbar() in orig/Sources/Play.c:1003-1024

export function newSbar(deps: {
  lives: number
  message: string | null
  level: number
  score: number
  fuel: number
  bonus: number
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap
```

- Complete redraw of status bar
- Gets statusBarTemplate from spriteService.getStatusBarTemplate()
- Calls sbarClear first
- Then calls all individual write functions
- Used when major changes occur (new ship, level change, etc.)

#### `updateSbar.ts`

```typescript
// Corresponds to update_sbar() in orig/Sources/Play.c:1027-1034

export function updateSbar(deps: {
  fuel: number | null // Only update if provided
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap
```

- Incremental update for frequently changing values
- Gets statusBarTemplate from spriteService.getStatusBarTemplate()
- Original only updates fuel, but we can extend for other values

## Status Bar Layout

Based on the original code positions:

```
Top Row (y=0):
- Ships (x=8+): Life indicators
- Score label & value (right side, variable x position)

Bottom Row (y=12):
- Message area (x=8): "FUEL CRITICAL", etc.
- Fuel value (x=296): Current fuel
- Bonus value (x=384): Planet bonus
- Level (x=456): Current level
```

## Implementation Order

1. **Phase 0: Sprite Service Updates**

   - Add status bar template loading to sprite service
   - Add getStatusBarTemplate() method
   - Update constants file with position constants

2. **Phase 1: Basic Writers**

   - writeInt
   - writeLong
   - writeStr

3. **Phase 2: Specific Field Writers**

   - writeFuel
   - writeScore
   - writeBonus
   - writeLives
   - writeLevel
   - writeMessage

4. **Phase 3: Complete Functions**
   - newSbar
   - updateSbar

## Testing Strategy

1. Create a test game that exercises each function
2. Verify positions match original game screenshots
3. Test number formatting (right-alignment, clearing old digits)
4. Test message display with various strings
5. Test complete status bar updates

## Notes

- All functions follow the pure functional pattern: `(deps) => (screen) => screen`
- Status bar template is accessed via `spriteService.getStatusBarTemplate()`
- The sprite service provides properly inverted digit sprites
- Positions are defined as constants for clarity and maintainability
- The original uses both front_screen and back_screen for double buffering, but our implementation handles single screen transforms
- State management (fuel warnings, score tracking) is handled separately from rendering
