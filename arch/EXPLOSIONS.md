# Explosion System

This document describes how explosions work in Continuum, covering both ship and bunker destructions.

## Overview

Continuum uses a dual particle system for explosions:

1. **Shards** - Large rotating debris pieces (visual sprites)
2. **Sparks** - Small point particles (single pixels)

Both systems work together to create dramatic explosion effects, with ship explosions being intentionally more spectacular than bunker explosions.

## Data Structures

### Shards (`shardrec` in GW.h:271)

```c
typedef struct {
    int x, y,        // Global position
    h, v,            // Velocity * 8 (fixed-point math)
    rot16,           // Current rotation * 16 (0-255)
    rotspeed,        // Rotation speed per frame
    lifecount,       // Frames until disappearance
    kind;            // Which sprite to use (from bunker type)
} shardrec;
```

- Global array: `shardrec shards[NUMSHARDS]` (15 slots)
- Recycled using oldest-first replacement
- Each shard uses rotating sprites with 16 angles

### Sparks (`shotrec` in GW.h:229)

```c
typedef struct {
    int x, y,        // Current position
    x8, y8,          // Position * 8 (fixed-point)
    lifecount,       // Frames remaining
    v, h,            // Velocity * 8
    strafedir,       // For strafe effects (-1 if spark)
    btime;           // Bounce time (unused for sparks)
    linerec *hitline;// Line hit (unused for sparks)
} shotrec;
```

- Global array: `shotrec sparks[NUMSPARKS]` (100 slots)
- Tracking variables:
  - `totalsparks` - Number of sparks in current explosion
  - `sparksalive` - Count of active sparks

## Explosion Types

### Ship Explosion

Triggered by `start_death()` (Terrain.c:411):

- **100 sparks** spread in 360 degrees
- **35-55 frame lifetime** (1.75-2.75 seconds at 20 FPS)
- **No shards** (ship vaporizes completely)
- Higher initial velocity
- Priority over bunker explosions

### Bunker Explosion

Triggered by `start_explosion()` (Terrain.c:315):

- **5 shards** with directional spread
- **20 sparks** in 180-degree arc facing shot
- Shards: 25-40 frame lifetime
- Sparks: 10-30 frame lifetime
- Lower initial velocities

## Key Functions

### `start_explosion()` (Terrain.c:315)

Called when bunkers are destroyed:

```c
start_explosion(x, y, dir, kind)
{
    // Create 5 shards
    for (i=0; i < EXPLSHARDS; i++) {
        // Find oldest shard slot to reuse
        // Set position with random distribution
        // Set velocity based on direction
        // Assign rotation and spin
    }

    // Check ship explosion priority
    if (totalsparks == NUMSPARKS && sparksalive) return;

    // Create 20 sparks
    totalsparks = sparksalive = EXPLSPARKS;
    for (shot=sparks; shot < sparks+EXPLSPARKS; shot++) {
        // Set position and velocity
        // Directional spread based on shot angle
    }
}
```

### `start_blowup()` (Terrain.c:424)

Generic spark explosion function:

```c
start_blowup(x, y, numspks, minsp, addsp, minlife, addlife)
{
    totalsparks = sparksalive = numspks;
    for (shot=sparks; shot < sparks+numspks; shot++) {
        shot->x8 = x << 3;
        shot->y8 = y << 3;
        shot->lifecount = minlife + rint(addlife);
        rand_shot(0, 511, shot);  // Random 360-degree spread
        speed = minsp + rint(addsp);
        shot->h = (speed * shot->h) >> 4;
        shot->v = (speed * shot->v) >> 4;
    }
}
```

### `draw_explosions()` (Terrain.c:447)

Called every frame to update and render particles:

```c
draw_explosions()
{
    // Update shards
    for(sp=shards, i=0; i < NUMSHARDS; sp++, i++)
        if(sp->lifecount) {
            sp->lifecount--;
            sp->h -= sp->h >> SH_SLOW;           // Friction
            sp->v -= sp->v >> SH_SLOW;
            gravity_vector(sp->x, sp->y, &xg, &yg);
            sp->h += xg << 2;                    // Gravity
            sp->v += yg << 2;
            sp->x += sp->h >> 8;                 // Update position
            sp->y += sp->v >> 8;
            sp->rot16 = (sp->rot16 + sp->rotspeed) & 255;  // Rotate
            // Draw if on screen
        }

    // Update sparks
    if (sparksalive)
        for(shot=sparks, i=0; i < totalsparks; shot++, i++)
            if(shot->lifecount) {
                if (!--shot->lifecount) sparksalive--;
                shot->h -= (shot->h+4) >> 3;     // Friction
                shot->v -= (shot->v+4) >> 3;
                shot->x8 += shot->h;              // Update position
                shot->y8 += shot->v;
                // Handle world wrap
                // Draw if on screen
            }
}
```

## Physics

### Shards

- **Friction**: Velocity reduced by 1/32 each frame (`h >> SH_SLOW`)
- **Gravity**: Affected by gravity generators
- **Rotation**: Continuous spin at individual rates
- **World wrap**: Handled for horizontal movement

### Sparks

- **Friction**: More aggressive than shards (`(h+4) >> 3`)
- **No gravity**: Sparks are too light
- **World wrap**: Horizontal wrapping only
- **Vertical limit**: Die if y < 0

## Rendering

### Shard Rendering

```c
draw_shard(x, y, shard_images[kind][dither][rotation], SHARDHT);
```

- Uses rotating sprites (16 angles)
- Sprite selected by bunker type
- Dithering: `[(x+y) & 1]` for variety
- Height: `SHARDHT` pixels

### Spark Rendering

```c
draw_spark_safe(x, y);
```

- Single pixel points
- No rotation or sprites
- "Safe" version handles screen boundaries

## Priority System

Ship explosions have absolute priority:

```c
if (totalsparks == NUMSPARKS && sparksalive) return;
```

This ensures the dramatic 100-spark ship death is never interrupted by bunker explosions.

## Constants

### Shard Constants

- `NUMSHARDS`: 15 (total shard slots)
- `EXPLSHARDS`: 5 (shards per bunker explosion)
- `SH_LIFE`: 25 (base lifetime frames)
- `SH_ADDLIFE`: 15 (random additional frames)
- `SH_SPEED`: 32 (velocity multiplier)
- `SH_ADDSPEED`: 16 (random velocity bonus)
- `SH_SLOW`: 5 (friction factor)
- `SH_SPIN2`: 64 (max rotation speed)
- `SH_DISTRIB`: 20 (spawn area size)

### Spark Constants

- `NUMSPARKS`: 100 (total spark slots)
- `SHIPSPARKS`: 100 (sparks for ship death)
- `EXPLSPARKS`: 20 (sparks per bunker)
- `SH_SPARKLIFE`: 35 (ship spark base lifetime)
- `SH_SPADDLIFE`: 20 (ship spark random bonus)
- `SPARKLIFE`: 10 (bunker spark base lifetime)
- `SPADDLIFE`: 20 (bunker spark random bonus)
- `SH_SP_SPEED16`: 50 (ship spark speed)
- `SP_SPEED16`: 8 (bunker spark base speed)

## Design Notes

1. **Visual hierarchy**: Ship explosions are 5x larger than bunker explosions
2. **Performance**: Fixed arrays with recycling avoid allocation
3. **Variety**: Random parameters ensure each explosion is unique
4. **Physics integration**: Shards affected by gravity for realism
5. **Drawing order**: Explosions drawn after most objects for visibility
