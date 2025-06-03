# Ship Movement Mechanics

This document describes how ship movement works in Continuum, based on the original 68K Mac source code in `orig/Sources/Play.c`.

## Overview

The ship movement system uses:
- Fixed-point velocity with 8-bit fractional precision
- Thrust vectors in 32 directions (11.25° increments)
- Point-based gravity system with inverse-square law
- Friction that gradually slows the ship
- Screen scrolling with soft boundaries

## Core Movement Loop

The movement system is updated every frame in `move_and_display()` (Play.c:192-265):

1. Read player input via `ship_control()` (Play.c:461-557)
2. Apply thrust, gravity, and friction to velocity
3. Move ship with `move_ship()` (Play.c:382-392)
4. Constrain ship position and scroll screen with `contain_ship()` (Play.c:394-457)

## Physics Components

### Thrust

When the thrust key is pressed (Play.c:481-492):

```c
if( (pressed & KEY_THRUST) && fuel)
{
    dx += (bouncing ? 1 : 2) * thrustx[shiprot];
    dy += (bouncing ? 1 : 2) * thrustx[(shiprot+24) & 31];
    // ... fuel burning and sound
}
```

**Thrust Vector Table** (Play.c:34-35):
```c
int thrustx[32]={0, 9, 18, 27, 34, 40, 44, 47, 48, 47, 44, 40, 34, 27, 18, 9,
                 0,-9,-18,-27,-34,-40,-44,-47,-48,-47,-44,-40,-34,-27,-18,-9};
```

- 32 directions = 11.25° per increment
- Maximum thrust = 48 units at cardinal directions
- Y-component uses same table offset by 24 positions (270°)
- Thrust is halved when bouncing off walls

### Gravity

Gravity is applied every frame when not bouncing (Play.c:500-505):

```c
if (!bouncing)
{
    gravity_vector(globalx, globaly, &xgravity, &ygravity);
    dx += xgravity;
    dy += ygravity;
}
```

**Gravity Calculation** (Play.c:585-636):
- Starts with global gravity values (`gravx`, `gravy`)
- Adds point gravity from each generator bunker
- Uses inverse-square law with 68K assembly optimization
- Formula: `force = strength / (distance²)`
- Handles world wrapping for gravity sources

### Friction

Applied every frame to gradually slow the ship (Play.c:496-498):

```c
dx -= (dx >> 6) + (dx > 0 ? 1 : 0);          // friction
dy -= (dy >> 6) + (dy > 0 && !cartooning ? 1 : 0);
```

- Divides velocity by 64 and adds 1 for guaranteed deceleration
- Ensures ship eventually stops without input
- Cartoon mode uses older friction model (no +1 on Y-axis)

### Velocity Application

Uses fixed-point math with 8-bit fractional part (Play.c:384-389):

```c
xslow += dx;            // Add velocity to accumulator
shipx += xslow >> 8;    // Extract whole pixels
xslow &= 255;           // Keep fractional part
yslow += dy;
shipy += yslow >> 8;
yslow &= 255;
```

This provides smooth sub-pixel movement at 1/256 pixel precision.

## Screen Scrolling System

The `contain_ship()` function (Play.c:394-457) implements a soft-boundary camera system:

### Horizontal Scrolling

```c
if (shipx < LEFTMARG)
{
    screenx += shipx - LEFTMARG;
    shipx = LEFTMARG;
}
else if (shipx > RIGHTMARG)
{
    screenx += shipx - RIGHTMARG;
    shipx = RIGHTMARG;
}
```

### Vertical Scrolling

```c
if (shipy < TOPMARG)
{
    screeny += shipy - TOPMARG;
    shipy = TOPMARG;
}
else if (shipy > BOTMARG)
{
    screeny += shipy - BOTMARG;
    shipy = BOTMARG;
}
```

### World Boundaries

**Non-wrapping worlds** (Play.c:405-412, 427-434):
- Screen stops at world edges
- Ship position adjusted to stay in bounds

**Wrapping worlds** (Play.c:414-417):
```c
if(screenx >= worldwidth)
    screenx -= worldwidth;
else if(screenx < 0)
    screenx += worldwidth;
```

### Edge Constraints

Ship cannot go within `SHIPHT` pixels of screen edge (Play.c:445-456):
- Velocity set to 0 when hitting boundaries
- Recursive call to `contain_ship()` to recalculate positions

## Position Variables

- **`shipx, shipy`**: Ship position on screen (pixels)
- **`screenx, screeny`**: Top-left corner of viewport in world coordinates
- **`globalx, globaly`**: Ship's absolute position in world (Play.c:438-441)
- **`xslow, yslow`**: Fractional position accumulators (0-255)
- **`dx, dy`**: Velocity components (×256 for fixed-point)

## Constants and Margins

From `GW.h` (referenced in Play.c):
- `SCRWTH`: 512 pixels (screen width)
- `VIEWHT`: 318 pixels (gameplay area height)
- `SHIPHT`: Ship sprite height
- `LEFTMARG`, `RIGHTMARG`, `TOPMARG`, `BOTMARG`: Scrolling boundaries

## Input Handling

The `ship_control()` function (Play.c:461-557) reads keyboard input:
- **Left/Right arrows**: Rotate ship (Play.c:475-478)
- **Thrust key**: Apply forward acceleration (Play.c:481-492)
- **Shield key**: Activate shield and collect fuel (Play.c:507-527)
- **Fire key**: Shoot projectiles (Play.c:529-556)

Uses `GetKeys()` Mac Toolbox call to read keyboard state (Play.c:672).