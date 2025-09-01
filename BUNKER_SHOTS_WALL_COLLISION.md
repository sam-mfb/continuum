# Bunker Shots vs Wall Collision Implementation Guide

## Overview

This document provides a detailed implementation guide for bunker shots hitting walls, with extensive citations to the original C source code. The key insight is that bunker shots use **predictive collision** - the collision is calculated once when the shot is created, not checked every frame.

## Original C Implementation Reference

The core implementation spans multiple files:

- **Shot creation**: `Bunkers.c:125-190` in `bunk_shoot()`
- **Predictive collision**: `Terrain.c:146-230` in `set_life()`
- **Shot movement**: `Play.c:816-846` in `move_bullets()`

## Key Concept: Predictive Collision

Unlike pixel collision, bunker shots use predictive ray-casting to determine their entire lifecycle at creation time:

```c
// Bunkers.c:176-180 - When creating a bunker shot
sp->x8 = (bp->x + xbshotstart[bp->kind][bp->rot]) << 3;
sp->y8 = (bp->y + ybshotstart[bp->kind][bp->rot]) << 3;
sp->lifecount = BUNKSHLEN;  // Initial life: SHOTLEN-5 = 30 cycles
sp->btime = 0;
set_life(sp, NULL);  // Calculate wall collision & adjust lifecount
```

## Constants (`GW.h`)

```c
#define SHOTLEN 35           /* cycles bullets keep going */
#define BUNKSHLEN (SHOTLEN-5) /* cycles bunk shots keep going = 30 */
#define SCENTER 16           /* ship center offset */
#define SHRADIUS             /* shield radius (exact value TBD) */
```

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

## Step 1: Bunker Shot Creation (`Bunkers.c:176-180`)

When a bunker shoots, the shot is initialized with:

```c
// Bunkers.c:176-177 - Set initial position (*8 for precision)
sp->x8 = (bp->x + xbshotstart[bp->kind][bp->rot]) << 3;
sp->y8 = (bp->y + ybshotstart[bp->kind][bp->rot]) << 3;

// Bunkers.c:178 - Set maximum lifetime
sp->lifecount = BUNKSHLEN;  // 30 cycles

// Bunkers.c:179 - No bounce time initially
sp->btime = 0;

// Bunkers.c:180 - CRITICAL: Calculate wall collision
set_life(sp, NULL);
```

The `set_life()` call is crucial - it precalculates when/where the shot will hit a wall.

## Step 2: Predictive Collision (`Terrain.c:146-230`)

The `set_life()` function calculates the shot's entire trajectory:

```c
// Terrain.c:146-151 - set_life function signature
set_life(sp, ignoreline)
register shotrec *sp;
linerec *ignoreline;
{
    register int m1, x2, y2, y0;
    register linerec *line;
    int x0, life, shortest, totallife;

    // Terrain.c:152-153 - Initialize with current lifecount
    shortest = sp->lifecount;
    totallife = shortest + sp->btime;

    // Terrain.c:154-157 - Calculate shot endpoints
    sp->x = sp->x8 >> 3;
    sp->y = sp->y8 >> 3;
    x2 = (sp->x8 + sp->h * shortest) >> 3;  // End position X
    y2 = (sp->y8 + sp->v * shortest) >> 3;  // End position Y

    // Terrain.c:159-175 - Check each terrain line
    for (line = lines; line->type; line++)
    {
        // Skip ghost walls and the ignore line
        if(line->kind != L_GHOST && line != ignoreline)
        {
            // Calculate intersection point and time
            // ... complex line intersection math ...

            if (life < shortest)  // Found earlier collision
            {
                shortest = life;  // Update lifecount
                sp->strafedir = getstrafedir(line, sp->x, sp->y);
                sp->hitline = line;
                // Recalculate endpoints with new lifetime
            }
        }
    }
```

### Key Points:

1. **One-time calculation**: This happens ONCE when shot is created
2. **Updates lifecount**: Sets exact frame when shot will expire at wall
3. **Handles bounce walls**: Sets `btime` for bounce physics (lines 226-228 not shown)
4. **Stores hit line**: Keeps reference to the wall that will be hit

## Step 3: Shot Movement (`Play.c:816-846`)

During gameplay, bunker shots move and check their lifecount:

```c
// Play.c:816-820 - move_bullets function
move_bullets()
{
    register shotrec *sp, *end;
    register int left, right, top, bot;

    // Play.c:821 - Process all bunker shots
    end = bunkshots+NUMSHOTS;

    // Play.c:826-828 - For each active shot
    for (sp=bunkshots; sp < end; sp++)
        if (sp->lifecount)
        {
            // Play.c:829 - Move the shot
            move_shot(sp);

            // Play.c:830-837 - Shield check (ignoring for now)
            // ...

            // Play.c:839-843 - Handle bouncing
            if (sp->lifecount == 0 && sp->btime > 0)
            {
                backup_shot(sp);  // Move back to wall
                bounce_shot(sp);  // Calculate bounce
            }

            // Play.c:844 - Draw the shot
            DRAW_SHOT(sp);
        }
}
```

### Critical Observation:

- **No wall collision check here!** The collision was already calculated in `set_life()`
- The shot simply expires when `lifecount` reaches 0
- If `btime > 0`, it bounces instead of disappearing

## Step 4: Shot Lifecycle

The lifecycle is controlled by `move_shot()` (Play.c:848+):

```c
move_shot(sp)
{
    // Decrement lifecount each frame
    if (--sp->lifecount <= 0)
    {
        // Shot expires at precalculated wall position
        sp->lifecount = 0;
        // If btime > 0, bouncing will be handled
    }

    // Update position
    sp->x8 += sp->h;
    sp->y8 += sp->v;
    sp->x = sp->x8 >> 3;
    sp->y = sp->y8 >> 3;
}
```

## TypeScript Implementation Strategy

### 1. When Creating Bunker Shot (`bunkShoot.ts`)

```typescript
// In /src/shots/bunkShoot.ts

function createBunkerShot(bunker: Bunker) {
  const shot: Shot = {
    // Set initial position (Bunkers.c:176-177)
    x8: (bunker.x + xbshotstart[bunker.kind][bunker.rot]) << 3,
    y8: (bunker.y + ybshotstart[bunker.kind][bunker.rot]) << 3,

    // Set velocity based on shot type
    h: shotVelocityH, // Calculated by rand_shot or follow_shot
    v: shotVelocityV,

    // Initial lifecycle (Bunkers.c:178-179)
    lifecount: BUNKSHLEN, // 30 cycles
    btime: 0,
    strafedir: -1,
    hitline: null
  }

  // CRITICAL: Calculate wall collision (Bunkers.c:180)
  setLife(shot, null)

  return shot
}
```

### 2. Implement `setLife()` (`setLife.ts`)

```typescript
// In /src/shots/setLife.ts

export function setLife(shot: Shot, ignoreLine: Line | null): void {
  // Following Terrain.c:152-157
  let shortest = shot.lifecount
  const totallife = shortest + shot.btime

  // Current position
  shot.x = shot.x8 >> 3
  shot.y = shot.y8 >> 3

  // Calculate endpoint if no collision
  let x2 = (shot.x8 + shot.h * shortest) >> 3
  let y2 = (shot.y8 + shot.v * shortest) >> 3

  // Check each terrain line (Terrain.c:159+)
  for (const line of terrainLines) {
    // Skip ghost walls and ignored line
    if (line.kind === L_GHOST || line === ignoreLine) {
      continue
    }

    // Calculate intersection with this line
    const life = calculateIntersection(shot, line)

    if (life >= 0 && life < shortest) {
      // Earlier collision found (Terrain.c:168-174)
      shortest = life
      shot.strafedir = getStrafedir(line, shot.x, shot.y)
      shot.hitline = line

      // Update endpoints
      x2 = (shot.x8 + shot.h * shortest) >> 3
      y2 = (shot.y8 + shot.v * shortest) >> 3
    }
  }

  // Set final lifecount (wall collision frame)
  shot.lifecount = shortest

  // Handle bounce walls (Terrain.c:226-228)
  if (shot.hitline && shot.hitline.kind === L_BOUNCE) {
    shot.btime = totallife - shortest
  }
}
```

### 3. Movement Update (`shotsSlice.ts`)

```typescript
// In /src/shots/shotsSlice.ts - moveBullets action

// For each bunker shot (Play.c:826-828)
if (shot.lifecount > 0) {
  // Move shot (Play.c:829)
  moveShot(shot) // Decrements lifecount, updates position

  // Handle wall bounce (Play.c:839-843)
  if (shot.lifecount === 0 && shot.btime > 0) {
    backupShot(shot) // Move back to wall position
    bounceShot(shot) // Calculate new trajectory
    setLife(shot, shot.hitline) // Recalculate for new path
  }

  // Shot will be drawn elsewhere
}
```

## Key Implementation Notes

### 1. **Predictive vs Per-Frame**

- Ship shots check collision every frame (expensive but necessary)
- Bunker shots calculate once at creation (efficient for many shots)
- This is why `set_life()` is called in `Bunkers.c:180`, not in movement

### 2. **No Collision Check in Movement**

- `move_bullets()` (Play.c:816-846) has NO wall collision code
- It only checks shield collision (which we're ignoring)
- Wall "collision" happens when `lifecount` reaches 0

### 3. **Bounce Handling**

- Bounce walls set `btime` to remaining lifetime
- When shot "hits" (`lifecount==0`), if `btime>0`, it bounces
- `bounce_shot()` calculates new trajectory
- `set_life()` is called again for the new path

### 4. **World Wrapping**

- The original handles toroidal worlds
- Line intersection must account for wrapped coordinates
- Implementation detail in `Terrain.c` line intersection math

## Testing Checklist

Based on original implementation:

- [ ] `setLife()` called when shot created (Bunkers.c:180)
- [ ] Lifecount set to wall collision frame (Terrain.c:168)
- [ ] Shot expires at exact wall position
- [ ] No per-frame collision checking
- [ ] Bounce walls set `btime` correctly
- [ ] Bounced shots get new trajectory
- [ ] Ghost walls are ignored (L_GHOST)
- [ ] Performance with many shots remains good
- [ ] Shots work across world wrap boundaries

## Files to Modify - Specific Changes Required

### 1. **`/src/shots/shotsSlice.ts` - bunkShoot reducer**

**Current State:** Bunker shots are created without any wall collision calculation.

**Required Change:** Add `setLife()` call after creating each shot.

```typescript
// In bunkShoot reducer, after creating each shot:
// BEFORE: shot is added directly to state.bunkshots
// AFTER: Add this before pushing to array:

// Calculate wall collision (Bunkers.c:180)
setLife(shot, null, action.payload.walls, worldwidth, worldwrap)
```

**Also need to:** Add `walls` to the `bunkShoot` action payload type.

### 2. **`/src/shots/shotsSlice.ts` - moveBullets reducer**

**Current State:** `moveBullets` just moves shots and decrements lifecount, no bounce handling.

**Required Change:** Add bounce detection and handling after moving each shot.

```typescript
// In moveBullets reducer, after moveShot(shot):
// ADD this bounce handling:

if (shot.lifecount === 0 && shot.btime > 0) {
  // Shot hit a bounce wall
  backupShot(shot)  // Move back to exact wall position
  bounceShot(shot)  // Calculate new velocity vector
  // Recalculate collision for new trajectory
  setLife(shot, shot.hitline, action.payload.walls, worldwidth, worldwrap)
}
```

**Also need to:** Add `walls` to the `moveBullets` action payload type.

### 3. **`/src/app/games/shipMoveBitmap.ts` and other games**

**Current State:** Dispatches `bunkShoot` without wall data.

**Required Change:** Add walls to the action payload.

```typescript
// BEFORE:
store.dispatch(
  bunkShoot({
    screenx: state.screen.screenx,
    screenr: screenr,
    screeny: state.screen.screeny,
    screenb: screenb,
    bunkrecs: state.planet.bunkers,
    worldwidth: state.planet.worldwidth,
    worldwrap: state.planet.worldwrap,
    globalx: globalx,
    globaly: globaly
  })
)

// AFTER: Add walls
store.dispatch(
  bunkShoot({
    // ... existing params
    walls: state.planet.lines  // ADD THIS
  })
)
```

**Similarly for `moveBullets`:**
```typescript
// BEFORE:
store.dispatch(
  moveBullets({
    worldwidth: state.planet.worldwidth,
    worldwrap: state.planet.worldwrap
  })
)

// AFTER: Add walls
store.dispatch(
  moveBullets({
    worldwidth: state.planet.worldwidth,
    worldwrap: state.planet.worldwrap,
    walls: state.planet.lines  // ADD THIS
  })
)
```

### 4. **`/src/shots/setLife.ts`**

**Current State:** Already exists and implements predictive collision for ship shots.

**Required Change:** None - it should already work for bunker shots. Just needs to be called.

### 5. **`/src/shots/types.ts`**

**Current State:** Verify `BulletRec` has all needed fields.

**Required Fields:**
- `hitline: Line | null` - reference to the wall that will be hit
- `btime: number` - bounce time (cycles after bounce)

If missing, add these fields to the `BulletRec` type.

### 6. **Implement helper functions (if not exist)**

Need to implement or verify existence of:
- `backupShot(shot)` - moves shot back to exact wall collision point
- `bounceShot(shot)` - calculates new velocity after bounce

## Critical Difference from Ship Shots

| Aspect           | Ship Shots                | Bunker Shots             |
| ---------------- | ------------------------- | ------------------------ |
| Collision Method | Per-frame pixel check     | One-time predictive      |
| When Calculated  | Every frame in movement   | Once at creation         |
| Performance      | O(n) per frame            | O(1) per frame           |
| Implementation   | `check_figure()` calls    | `set_life()` at creation |
| Code Location    | Play.c:760-814 (movement) | Bunkers.c:180 (creation) |
