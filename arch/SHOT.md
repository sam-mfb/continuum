# Shot/Bullet Mechanics

This document describes how the shooting system works in Continuum, based on the original 68K Mac source code in `orig/Sources/Play.c`.

## Overview

The shooting system features:
- Maximum of 6 simultaneous player bullets
- Single shot per button press (no auto-fire)
- Bullets inherit ship velocity
- 35-frame maximum lifetime
- Wall bouncing with reflection physics
- Cannot shoot while shield is active

## Shooting Controls

### Input Handling (Play.c:529-556)

The `ship_control()` function manages shooting:

```c
if(pressed & KEY_SHOOT)
{   if(!firing)
    {   firing = TRUE;
        // ... shoot logic
    }
}
else
    firing = FALSE;
```

**Key Features:**
- `firing` flag prevents auto-fire - must release and press again
- Shield blocks shooting: `if(i<NUMBULLETS && !shielding)`

## Bullet Data Structure

Each bullet (`shotrec`) tracks:
- `x8, y8`: Position in 8x precision (sub-pixel accuracy)
- `x, y`: Position in pixels
- `h, v`: Velocity components
- `lifecount`: Frames until bullet expires
- `btime`: Bounce time tracking
- `strafedir`: Direction for wall strafing effects
- `hitline`: Reference to wall that was hit

## Bullet Initialization

When firing a new bullet (Play.c:535-551):

```c
int yrot = (shiprot + 24) & 31;
sp->h = shotvecs[shiprot] + (dx >> 5);    // Horizontal velocity
sp->v = shotvecs[yrot] + (dy >> 5);       // Vertical velocity
sp->x8 = (globalx << 3);                  // Position in 8x precision
sp->y8 = (globaly << 3);
sp->lifecount = SHOTLEN;                  // 35 frames lifetime
```

### Velocity Calculation

**Base Shot Velocity** (Play.c:38-41):
```c
int shotvecs[32]={0, 14, 27, 40, 51, 60, 67, 71, 
                  72, 71, 67, 60, 51, 40, 27, 14,
                  0, -14, -27, -40, -51, -60, -67, -71, 
                  -72, -71, -67, -60, -51, -40, -27, -14};
```

- Maximum speed: 72 units (at 45° angles)
- Cardinal directions: varies from 0 (up/down) to 71 (left/right)
- **Inherits 1/32 of ship velocity** for realistic physics

### Initial Collision Check

After creation, bullets immediately check for walls:
```c
set_life(sp, NULL);
if (sp->lifecount > 0)
{
    sp->x8 += shotvecs[shiprot];  // Move one frame forward
    sp->y8 += shotvecs[yrot];
    sp->lifecount--;
}
if (sp->lifecount == 0)
    bounce_shot(sp);               // Hit wall on first frame
```

## Bullet Movement

The `move_shot()` function (Play.c:848-874) updates each bullet:

1. Decrements `lifecount`
2. Updates position: `x8 += h; y8 += v`
3. Handles world wrapping for toroidal worlds
4. Converts 8x precision to pixels: `x = x8 >> 3`
5. Expires bullet if it goes off top of world

## Wall Bouncing System

### Collision Detection

The `lifecount` variable serves dual purpose:
- **Normal countdown**: Decrements each frame until 0
- **Wall collision**: Set to frames-until-impact by `set_life()`

When `lifecount` reaches 0 and `btime > 0`, a wall collision occurred.

### Bounce Physics (Play.c:926-948)

```c
bounce_shot(sp)
{
    // Calculate dot product with wall normal
    dot = sp->h * x1 + sp->v * y1;
    // Reflect velocity
    sp->h -= x1 * dot / (24*48);
    sp->v -= y1 * dot / (24*48);
    // Restore lifetime for continued flight
    sp->lifecount = sp->btime;
    sp->btime = 0;
}
```

**Bounce Features:**
- Backs up bullet to prevent wall sticking
- Calculates reflection using dot product with wall normal
- Allows multiple bounces until total lifetime expires
- Can trigger wall strafing visual effects

## Collision Handling

The `move_shipshots()` function (Play.c:750-814) checks collisions:

### Bunker Collisions
- Checks all bunkers within bullet's radius
- Validates hit angle for directional bunkers
- Hardy bunkers (DIFFBUNK type 2) require multiple hits
- Awards points and triggers explosion effects

### Self-Damage
```c
if (globalx > left && globalx < right &&
    globaly > top  && globaly < bot && 
    xyindist(sp->x - globalx, sp->y - globaly, SCENTER) &&
    !dead_count)
{
    shielding = TRUE;  // Auto-shield activation
    start_sound(SHLD_SOUND);
    sp->lifecount = sp->btime = 0;
}
```

Player's own bullets can hit their ship! This auto-activates shields if possible.

## Drawing

Bullets are drawn as simple 3x3 pixel squares when visible on screen.

## Constants

- `NUMBULLETS`: 6 (maximum player bullets)
- `SHOTLEN`: 35 (frames of bullet lifetime)
- `BRADIUS`: Collision radius for bunkers
- `SCENTER`: Collision radius for ship

## Design Rationale

1. **Limited Bullets**: Forces strategic shooting vs spray-and-pray
2. **Velocity Inheritance**: Creates realistic physics requiring lead calculation
3. **No Shield Shooting**: Prevents turtle strategy
4. **Wall Bouncing**: Enables trick shots and tactical play
5. **Friendly Fire**: Adds risk to careless shooting
6. **Fixed Range**: Prevents screen clutter and encourages close combat