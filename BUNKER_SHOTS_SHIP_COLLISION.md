# Bunker Shots vs Ship Collision Implementation Guide

## Overview

This document provides a detailed implementation guide for bunker shots hitting the ship. The current implementation is **broken** because bunker shots are drawn AFTER the collision check. This guide explains both the problem and the solution.

## The Problem: Drawing Order

### Current BROKEN Order (`shipMoveBitmap.ts`)

According to the collision implementation plan, bunker shots are currently drawn around line 500, which is AFTER the collision check at line ~420. This means bunker shots can never kill the ship!

### Correct Order (`Play.c:236-249`)

```c
// Play.c:236-239 - Draw lethal objects BEFORE collision check
black_terrain(L_NORMAL);     // Line 236
do_bunkers();                 // Line 237
if (!shielding)               // Line 238
    move_bullets();           // Line 239 - DRAWS BUNKER SHOTS

// Play.c:241-245 - THEN check collision
if(!dead_count)
{
    if (check_figure(shipx-SCENTER, shipy-SCENTER,
                    ship_masks[shiprot], SHIPHT))
        kill_ship();          // Line 245
```

The critical insight: **`move_bullets()` must happen BEFORE `check_figure()`**

## How Bunker Shot Collision Works

### Pixel Collision Method

Bunker shots use the same pixel collision system as terrain:

1. **Bunker shots are drawn to screen** via `DRAW_SHOT` macro (Play.c:844)
2. **Ship collision check** via `check_figure()` (Play.c:243-244)
3. **Collision detected** if any ship mask pixel overlaps shot pixels

### The DRAW_SHOT Macro (`Macros.h:18-25`)

```c
#define DRAW_SHOT(sp)                                          \
    {if (sp->y >= screeny && sp->y < screenb-1)               \
        if (sp->lifecount == 0 && sp->strafedir >= 0)         \
            start_strafe(sp->x, sp->y, sp->strafedir);        \
        else if(sp->x >= screenx && sp->x < screenr-1)        \
            draw_dot_safe(sp->x - screenx, sp->y - screeny);  \
        else if(on_right_side && sp->x < screenr-worldwidth-1)\
            draw_dot_safe(sp->x - screenx + worldwidth, sp->y - screeny);}
```

Key points:

- Uses `draw_dot_safe()` to draw a 2x2 pixel dot
- Handles world wrapping (toroidal worlds)
- Draws directly to screen buffer

### draw_dot_safe Function (`Draw.c:571-593`)

```c
// Draw.c:571-593 - Draws a 2x2 black dot
draw_dot_safe(x, y)
{
    // ... assembly code ...
    // Draws 0xC0000000 pattern (11000000...)
    // This creates a 2x2 pixel black square
}
```

Bunker shots appear as 2x2 pixel dots, smaller than ship shots (4x4 diamond).

## Implementation Fix

### Step 1: Fix Drawing Order in `shipMoveBitmap.ts`

**Current (BROKEN)**:

```typescript
// Line ~300-500 (approximate)
1. Clear screen
2. Draw non-lethal objects
3. Erase figure
4. Check bounce
5. Draw terrain
6. Draw bunkers (~410)
7. Check figure (~420) // COLLISION CHECK
8. Draw ship
9. Draw ship shots
10. Draw bunker shots (~500) // TOO LATE!
```

**Fixed Order** (matching Play.c:236-249):

```typescript
// Correct implementation
1. Clear screen
2. Draw non-lethal objects
3. Erase figure
4. Check bounce
5. Draw terrain (line 236)
6. Draw bunkers (line 237)
7. Draw bunker shots (line 239) // BEFORE collision!
8. Check figure (line 243-244) // Now detects bunker shots
9. Draw ship (line 248-249)
10. Draw ship shots
```

### Step 2: Move Bunker Shot Rendering

In `/src/app/games/shipMoveBitmap.ts`:

```typescript
// BEFORE (around line 500):
// DELETE this code from here
/*
if (!shielding) {
    // Draw bunker shots
    for (const shot of bunkerShots) {
        if (shot.lifecount > 0) {
            drawDotSafe(bitmap, shot.x - screenX, shot.y - screenY);
        }
    }
}
*/

// AFTER (around line 410, right after drawing bunkers):
// Draw bunkers (Play.c:237)
for (const bunker of bunkers) {
  if (bunker.alive) {
    drawBunker(bitmap, bunker, screenX, screenY)
  }
}

// ADD HERE: Draw bunker shots (Play.c:238-239)
if (!shielding) {
  // Shields protect from bunker shots
  for (const shot of bunkerShots) {
    if (shot.lifecount > 0) {
      // Calculate screen position
      const shotX = shot.x - screenX
      const shotY = shot.y - screenY

      // Check if on screen (DRAW_SHOT macro conditions)
      if (shotY >= 0 && shotY < VIEWHT - 1) {
        if (shotX >= 0 && shotX < SCRWTH - 1) {
          drawDotSafe(bitmap, shotX, shotY)
        } else if (onRightSide && shotX < SCRWTH - worldWidth - 1) {
          // Handle world wrap
          drawDotSafe(bitmap, shotX + worldWidth, shotY)
        }
      }
    }
  }
}

// THEN check collision (Play.c:243-244)
if (!deadCount) {
  if (
    checkFigure(
      bitmap,
      shipX - SCENTER,
      shipY - SCENTER,
      shipMasks[shipRot],
      SHIPHT
    )
  ) {
    killShip()
  }
}
```

## How Collision Detection Works

### 1. Bunker Shots Draw Pixels

`draw_dot_safe()` draws a 2x2 black square:

```
██  <- 2x2 pixel bunker shot
██
```

### 2. Ship Collision Check

`check_figure()` checks if ship mask overlaps any black pixels:

- Takes ship position and collision mask
- Checks each mask pixel against screen
- If any mask pixel overlaps a shot pixel → collision

### 3. Result

Since bunker shots are now drawn BEFORE the collision check, they will trigger `kill_ship()` when the ship flies into them.

## Shield Protection (Play.c:238)

```c
// Play.c:238 - Shields prevent bunker shot drawing
if (!shielding)
    move_bullets();
```

When shields are active:

- Bunker shots are NOT drawn to screen
- Therefore can't trigger pixel collision
- This is different from the proximity-based shield protection in Play.c:830-837

## Complete Implementation Pattern

```typescript
// In /src/app/games/shipMoveBitmap.ts

// ... earlier rendering code ...

// Draw lethal terrain (Play.c:236)
drawTerrain(bitmap, L_NORMAL)

// Draw bunkers (Play.c:237)
doBunkers(bitmap)

// Draw bunker shots BEFORE collision check (Play.c:238-239)
if (!shielding) {
  moveBullets(bitmap) // This draws the shots
}

// Check for ship collision (Play.c:241-245)
if (!deadCount) {
  // This will now detect bunker shot pixels
  if (
    checkFigure(
      bitmap,
      shipX - SCENTER,
      shipY - SCENTER,
      shipMasks[shipRot],
      SHIPHT
    )
  ) {
    dispatch(killShip())
  }
}

// Draw ship after collision check (Play.c:246-249)
if (!deadCount) {
  fullFigure(
    bitmap,
    shipX - SCENTER,
    shipY - SCENTER,
    shipDefs[shipRot],
    shipMasks[shipRot],
    SHIPHT
  )
}
```

## Testing Checklist

Based on original implementation:

- [ ] Bunker shots drawn BEFORE collision check (Play.c:239 before 243)
- [ ] Ship dies when hitting bunker shot
- [ ] Bunker shots appear as 2x2 dots (not 4x4 diamonds)
- [ ] Shields prevent bunker shots from being drawn (Play.c:238)
- [ ] World wrapping works for off-screen shots
- [ ] Multiple bunker shots can be on screen
- [ ] Performance remains smooth

## Critical Differences

| Aspect            | Ship Shots             | Bunker Shots      |
| ----------------- | ---------------------- | ----------------- |
| Size              | 4x4 diamond            | 2x2 square        |
| Draw Function     | `draw_shipshot()`      | `draw_dot_safe()` |
| Collision Method  | Proximity (vs bunkers) | Pixel (vs ship)   |
| Shield Protection | Proximity check        | Not drawn at all  |

## Files to Modify

1. **`/src/app/games/shipMoveBitmap.ts`** (CRITICAL)

   - Move bunker shot rendering from ~line 500 to ~line 410
   - Must be after bunkers but BEFORE `checkFigure()`
   - Following Play.c:236-249 order exactly

2. **Verify `/src/shots/drawDotSafe.ts`**
   - Ensure it draws solid 2x2 black pixels
   - Must write to bitmap in a way `checkFigure()` can detect

## Why This Bug Exists

The TypeScript port likely separated shot movement from rendering, but the original C code combines them in `move_bullets()`. The `DRAW_SHOT` macro is called directly in the movement function (Play.c:844), making it easy to miss that drawing IS the collision mechanism.

## Summary

The fix is simple but critical:

1. **Move bunker shot drawing to happen BEFORE collision check**
2. **Ensure shots draw solid pixels that `checkFigure()` can detect**
3. **Respect the shield condition that prevents drawing**

This is a perfect example of how the drawing order in the original game is not just visual but also functional for collision detection.
