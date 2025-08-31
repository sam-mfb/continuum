# Ship Shots vs Bunker Collision Implementation Guide

## Overview

This document provides a detailed implementation guide for ship shots hitting bunkers, with extensive citations to the original C source code to ensure exact pattern matching.

## Original C Implementation Reference

The core collision logic is in **`Play.c:760-814`** in the `move_shipshots()` function.

## Data Structures

### Shot Record (`GW.h:229-237`)

```c
typedef struct
{   int x, y,         /* current global int x, y of shot */
    x8, y8,           /* x, y * 8 (global) */
    lifecount,        /* 0 if not going, time to death */
    v, h,             /* vert. & horiz speed * 8 */
    strafedir,        /* rotation of strafe (-1 if none) */
    btime;            /* cycles to go after bouncing */
    linerec *hitline; /* pointer to line that it hits */
} shotrec;
```

### Bunker Record (`GW.h:251-258`)

```c
typedef struct
{   int x, y,         /* global x, y, of center of base */
    rot,              /* 0-15 for facing up, nne, etc */
    kind,             /* which kind of bunker */
    alive;            /* true if bunker is alive and well */
    rangerec ranges[2]; /* arcs in which bunker will fire */
    int rotcount;     /* in animated, count to next frame */
} bunkrec;
```

## Constants (`GW.h`)

```c
#define BRADIUS 19           /* approx. radius of bunker (GW.h) */
#define BUNKROTKINDS 2       /* number of kinds that sit on walls (GW.h) */
#define DIFFBUNK 1           /* different at each orientation (GW.h) */
#define SCENTER 16           /* ship center offset (inferred from usage) */
```

## Collision Detection Algorithm

### Main Loop Structure (`Play.c:760-814`)

```c
// Play.c:760-761 - Check if shot is active
if (sp->lifecount)
{
    // Play.c:762 - Move the shot first
    move_shot(sp);

    // Play.c:763-766 - Calculate bounding box
    left = sp->x - BRADIUS;
    right = sp->x + BRADIUS;
    top = sp->y - BRADIUS;
    bot = sp->y + BRADIUS;
```

### Step 1: Bounding Box Pre-filtering (`Play.c:763-769`)

The original uses an optimization for sorted bunker arrays:

```c
// Play.c:767-768 - Skip bunkers to the left of bounding box
for (bp=bunkers; bp->x < left; bp++)
    ;  // Skip bunkers that are too far left

// Play.c:769 - Process bunkers within x-range
for (; bp->x < right; bp++)
```

**TypeScript Adaptation**: Since we likely don't have sorted bunkers, we'll use a simple bounding box check:

```typescript
// Bounding box check (adaptation of Play.c:763-766, 770)
if (bunker.x < left || bunker.x > right || bunker.y < top || bunker.y > bot) {
  continue // Outside bounding box
}
```

### Step 2: Full Collision Check (`Play.c:770-774`)

```c
// Play.c:770-774 - Complete collision condition
if (bp->alive && bp->y < bot && bp->y > top &&
    xyindistance(bp->x - sp->x, bp->y - sp->y, BRADIUS) &&
    (bp->kind >= BUNKROTKINDS ||
     legal_angle(bp->rot, bp->x, bp->y,
            sp->x - (sp->h >> 3), sp->y - (sp->v >> 3))) )
```

Breaking this down:

1. **`bp->alive`** - Bunker must be alive
2. **`bp->y < bot && bp->y > top`** - Y-axis bounding box check
3. **`xyindistance(..., BRADIUS)`** - Circular collision detection
4. **Angle check** - Either:
   - `bp->kind >= BUNKROTKINDS` - Omnidirectional bunker (can be hit from any angle)
   - OR `legal_angle(...)` returns true - Shot is coming from valid angle

### Step 3: Shot Trajectory for Angle Check (`Play.c:773-774`)

Critical detail: The angle check uses the shot's **previous position** to determine trajectory:

```c
// Play.c:773-774 - Calculate where shot came from
legal_angle(bp->rot, bp->x, bp->y,
    sp->x - (sp->h >> 3),    // Previous X: current - (velocity/8)
    sp->y - (sp->v >> 3))     // Previous Y: current - (velocity/8)
```

The `>> 3` is dividing by 8 because velocities are stored as `speed * 8` (see `GW.h:233`).

### Step 4: Handle Collision (`Play.c:775-784`)

```c
// Play.c:775 - Collision detected!
{
    // Play.c:776-777 - Destroy the shot
    sp->lifecount = sp->btime = 0;
    sp->strafedir = -1;

    // Play.c:778-781 - Hardy bunker check
    if (bp->kind == DIFFBUNK &&
        (bp->rot & 3) == 2 &&
        --bp->rotcount > 0)
            break;      /* hardy bunker still alive */

    // Play.c:782 - Destroy the bunker
    kill_bunk(bp);

    // Play.c:783 - Exit bunker loop (one shot, one kill max)
    break;
}
```

### Hardy Bunker Logic (`Play.c:778-781`)

Hardy bunkers are `DIFFBUNK` type with specific rotation:

- **Condition**: `bp->kind == DIFFBUNK && (bp->rot & 3) == 2`
- **Behavior**: Decrement `rotcount` and check if still alive
- **Note**: The `--bp->rotcount` modifies the bunker's hit counter in place

## Kill Bunker Function (`Play.c:351-370`)

When a bunker is destroyed:

```c
// Play.c:351-370 - kill_bunk function
kill_bunk(bp)
register bunkrec *bp;
{
    // Play.c:354-355 - Score tables
    static int kindscores[5] = {100, 0, 100, 400, 500},
               diffscores[4] = {10, 200, 300, 200};

    // Play.c:356 - Mark as dead
    bp->alive = FALSE;

    // Play.c:357-362 - Create crater for omnidirectional bunkers
    if (bp->kind >= BUNKROTKINDS)
    {
        craters[numcraters].x = bp->x;
        craters[numcraters].y = bp->y;
        numcraters++;
    }

    // Play.c:363-364 - Special handling for generator bunker
    if (bp->kind == GENERATORBUNK)
        init_gravity();

    // Play.c:365-366 - Add score
    score_plus(bp->kind == DIFFBUNK ? diffscores[bp->rot & 3] :
                                       kindscores[bp->kind]);

    // Play.c:367 - Start explosion
    start_explosion(bp->x, bp->y, bp->rot, bp->kind);

    // Play.c:368 - Play sound
    start_sound(EXP1_SOUND);

    // Play.c:369-370 - Check mission complete...
}
```

## TypeScript Implementation

### Complete Implementation Pattern

```typescript
// In /src/shots/shotsSlice.ts - moveShipshots action

// For each active shot (Play.c:760)
if (shot.lifecount > 0) {
  // Move shot first (Play.c:762)
  moveShot(shot)

  // Calculate bounding box (Play.c:763-766)
  const left = shot.x - BRADIUS
  const right = shot.x + BRADIUS
  const top = shot.y - BRADIUS
  const bot = shot.y + BRADIUS

  // Check each bunker
  for (const bunker of bunkers) {
    // Alive check (Play.c:770)
    if (!bunker.alive) continue

    // Bounding box check (Play.c:770 - y bounds check)
    if (
      bunker.x < left ||
      bunker.x > right ||
      bunker.y < top ||
      bunker.y > bot
    ) {
      continue
    }

    // Circular collision (Play.c:771)
    const dx = bunker.x - shot.x
    const dy = bunker.y - shot.y
    if (!xyindistance(dx, dy, BRADIUS)) {
      continue
    }

    // Angle check for directional bunkers (Play.c:772-774)
    if (bunker.kind < BUNKROTKINDS) {
      // Calculate shot trajectory using previous position
      const shotPrevX = shot.x - (shot.h >> 3)
      const shotPrevY = shot.y - (shot.v >> 3)

      if (!legalAngle(bunker.rot, bunker.x, bunker.y, shotPrevX, shotPrevY)) {
        continue // Hit from invalid angle
      }
    }
    // Note: Omnidirectional (kind >= BUNKROTKINDS) skip angle check

    // Collision confirmed! (Play.c:775)

    // Destroy shot (Play.c:776-777)
    shot.lifecount = 0
    shot.btime = 0
    shot.strafedir = -1

    // Hardy bunker check (Play.c:778-781)
    if (bunker.kind === DIFFBUNK && (bunker.rot & 3) === 2) {
      // Initialize rotcount if needed (not in original, but needed for state)
      if (!bunker.rotcount || bunker.rotcount <= 0) {
        bunker.rotcount = 3
      }

      bunker.rotcount--

      if (bunker.rotcount > 0) {
        // Bunker survives, shot is consumed
        break // Play.c:781
      }
    }

    // Kill bunker (Play.c:782)
    dispatch(
      killBunker({
        bunkerId: bunker.id,
        x: bunker.x,
        y: bunker.y,
        kind: bunker.kind,
        rot: bunker.rot
      })
    )

    // One shot can only kill one bunker (Play.c:783)
    break
  }
}
```

## Critical Implementation Details

### 1. **Order of Operations**

- Move shot FIRST (Play.c:762)
- Then check collisions with new position
- This ensures proper collision at high speeds

### 2. **Bounding Box Optimization**

- Original assumes sorted bunker array (Play.c:767-769)
- We adapt with simple bounds checking for unsorted arrays

### 3. **Angle Calculation**

- Must use PREVIOUS shot position (Play.c:773-774)
- Previous = current - (velocity >> 3)
- This determines the shot's approach angle

### 4. **Hardy Bunker State**

- Original modifies `rotcount` in place (Play.c:780)
- We need to track this in Redux state
- Initialize to 3 hits if not set

### 5. **Collision Priority**

- Shot destroyed immediately (Play.c:776-777)
- Even if bunker survives (hardy), shot is consumed
- Break ensures one shot = max one bunker kill

### 6. **Omnidirectional vs Directional**

- `kind >= BUNKROTKINDS`: Can be hit from any angle
- `kind < BUNKROTKINDS`: Must pass `legal_angle` check

## Testing Checklist

Based on the original implementation:

- [ ] Shot moves before collision check (Play.c:762)
- [ ] Bounding box eliminates distant bunkers (Play.c:763-769)
- [ ] Circular collision with BRADIUS=19 (Play.c:771)
- [ ] Directional bunkers check angle (Play.c:772-774)
- [ ] Shot trajectory uses h>>3, v>>3 (Play.c:773-774)
- [ ] Shot destroyed on any collision (Play.c:776-777)
- [ ] Hardy bunkers need 3 hits (Play.c:778-781)
- [ ] Only one bunker per shot (Play.c:783)
- [ ] Omnidirectional bunkers create craters (Play.c:357-362)
- [ ] Proper scoring based on bunker type (Play.c:365-366)
- [ ] Explosion at bunker position (Play.c:367)

## Files to Modify

1. **`/src/shots/shotsSlice.ts`**

   - Add collision check in `moveShipshots` action
   - Following Play.c:760-814 exactly

2. **`/src/planet/planetSlice.ts`**

   - Ensure bunker has `rotcount` field
   - `killBunker` action matching Play.c:351-370

3. **`/src/shots/constants.ts`** (or similar)
   - Add BRADIUS = 19
   - Add BUNKROTKINDS = 2
   - Add DIFFBUNK = 1

## Notes

- The original C code is highly optimized for 1980s hardware
- We maintain the same collision logic for gameplay authenticity
- The bounding box → circular → angle check sequence is intentional for performance
- Hardy bunkers are a special case that adds gameplay depth
