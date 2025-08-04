# Ship Death Mechanics

This document describes how ship destruction works in Continuum, based on the original 68K Mac source code.

## Overview

When the ship collides with terrain or is hit by an enemy bullet, it triggers a 4-second death sequence with a dramatic explosion effect. If the player has lives remaining, the ship respawns at the starting position after the animation completes.

## Death Sequence

### 1. Death Trigger (`kill_ship()` at Play.c:331)

When collision is detected, `kill_ship()` is called which:

```c
dead_count = DEAD_TIME;  // 80 frames at 20 FPS = 4 seconds
flaming = thrusting = refueling = shielding = FALSE;
```

- Sets a 4-second countdown timer
- Immediately disables all ship systems (thrust, shield, etc.)
- Checks for nearby bunkers to destroy (kamikaze mechanic)
- Calls `start_death()` to begin the explosion

### 2. Kamikaze Mechanic

When the ship dies, it can take a nearby bunker with it:

```c
for(bp=bunkers; bp->rot >= 0; bp++)
    if (bp->alive &&
        xyindist(bp->x - globalx, bp->y - globaly, SKILLBRADIUS) &&
        (legal_angle(bp->rot, bp->x, bp->y, globalx, globaly) ||
                                bp->kind >= BUNKROTKINDS) )
    {
        kill_bunk(bp);  // Destroy the bunker
        break;
    }
```

- Searches for bunkers within `SKILLBRADIUS` distance
- For directional bunkers, checks if ship is in valid angle
- Rotating bunkers are always vulnerable
- First qualifying bunker is destroyed (with full score awarded)
- Only one bunker can be destroyed per death

### 3. Explosion Start (`start_death()` at Terrain.c:411)

```c
start_death()
{
    set_screen(front_screen, 0L);  // "this is obnoxious!"
    start_sound(EXP2_SOUND);
    
    start_blowup((shipx + screenx) % worldwidth, shipy + screeny,
                    SHIPSPARKS,         // 100 sparks
                    16, SH_SP_SPEED16,  // Speed parameters
                    SH_SPARKLIFE, SH_SPADDLIFE);
}
```

The explosion creates:
- **100 sparks** (`SHIPSPARKS` = `NUMSPARKS` = 100)
- **Random directions** (360-degree spread)
- **Variable speed** (base 16 + random 0-50 units)
- **35-55 frame lifetime** per spark

### 4. During Death Animation

For the next 80 frames (4 seconds at 20 FPS):

- **Ship is invisible** - all drawing code checks `if (!dead_count)`
- **No control response** - input polling is skipped
- **Explosion animates** via `draw_explosions()`:
  - Each spark moves with velocity and friction
  - Sparks slow down: `shot->h -= (shot->h+4) >> 3`
  - When a spark's `lifecount` reaches 0, `sparksalive` decrements
  - Sparks are affected by gravity if generators are present
- **Game continues** - other objects still move and animate
- **View stays centered** - camera doesn't move during death

### 5. Death Countdown (`move_and_display()` at Play.c:203)

Each frame decrements the death counter:

```c
if (dead_count && !--dead_count)    // When countdown reaches 0
    if( numships--)                  // If lives remain
    {   
        fuel = FUELSTART;            // Reset fuel to full
        init_ship();                 // Respawn ship
    }
    else
    {   
        endofgame = TRUE;            // Game over
        return;
    }
```

### 6. Respawn (`init_ship()` at Play.c:162)

When respawning:
- Ship returns to level start position (`xstart`, `ystart`)
- Velocity reset to zero
- Rotation reset to 0 (facing up) unless in autopilot mode
- All enemy bullets cleared
- Shield and thrust states cleared
- Camera recenters on ship
- Fuel restored to `FUELSTART`

## Special Cases

### Level Completion During Death

If the planet ends while the ship is dead (Play.c:109-114):
```c
if (endofplanet)
{
    score_plus(planetbonus);
    crackle();
    if (dead_count)    // If still dead when planet ends
    {
        fuel = FUELSTART;
        numships--;    // Still lose a life
    }
}
```

### Direct Screen Drawing

The comment "this is obnoxious!" in `start_death()` refers to drawing directly to the front buffer instead of the back buffer. This creates an immediate visual impact but breaks the normal double-buffering pattern.

## Constants

From GW.h:
- `DEAD_TIME`: 80 frames (4 seconds)
- `NUMSPARKS`: 100 sparks in explosion
- `SHIPSPARKS`: Same as NUMSPARKS
- `SH_SPARKLIFE`: 35 frame minimum spark lifetime
- `SH_SPADDLIFE`: 20 additional random frames
- `SH_SP_SPEED16`: 50 speed units
- `SKILLBRADIUS`: Range for kamikaze bunker destruction

## Design Insights

1. **4-second duration** gives players time to process the death
2. **100 sparks** create a dramatic visual effect
3. **Kamikaze mechanic** provides consolation - take an enemy with you
4. **Gravity affects sparks** making explosions feel integrated with physics
5. **Direct screen draw** ensures immediate visual feedback