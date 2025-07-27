# Ship Drawing System in Continuum

## Overview

The ship drawing in Continuum uses a sophisticated three-layer rendering technique to create a drop shadow effect on the Mac's 1-bit display. The system cleverly exploits the checkerboard background pattern to generate a solid black shadow from dithered intermediate steps.

## Ship Data Structures

### Sprite Storage (Figs.c:12, Play.c:62)

- `ship_defs`: Contains the actual ship sprite graphics (32x32 pixels, 32 rotation angles)
- `ship_masks`: Contains solid black silhouettes for collision detection and masking
- Both are arrays of `Ship_Pic` type, defined as `int Ship_Pic[2*SHIPHT]` (GW.h:115)
- Each rotation stored as 32 32-bit integers (one per pixel row)

## Ship Rotation Generation

The game resources only store 5 ship images, not 32. The `rotate_ship()` function (Figs.c:651-687) generates all 32 rotations algorithmically:

### Resource Loading (Figs.c:552-566)
- `extract_ships()` loads only 11 images from resources:
  - Positions 0-4: 5 ship masks (facing up, up-right at different angles)
  - Positions 5-9: 5 ship definitions (matching the masks)
  - Position 10: Shield sprite

### Rotation Algorithm (Figs.c:658-687)
The function generates the remaining 27 rotations through bit manipulation:

1. **Clear positions 5-31** (lines 658-660)
   ```c
   for (x=5; x<32; x++)
       for(y=0, p=ships[x]; y < SHIPHT*2; y++, p++)
           *p = 0;
   ```

2. **Generate positions 5-8** (lines 663-667): 90° rotation
   - Rotates positions 0-3 by 90° clockwise
   - Maps pixel (x,y) → (SIZE-y, SIZE-x)
   - Creates right-facing ships from up-facing ones

3. **Generate positions 24-31** (lines 670-674): 270° rotation
   - Rotates positions 1-8 by 270° clockwise (or 90° counter-clockwise)
   - Maps pixel (x,y) → (SIZE-x, y) then flips
   - Creates left-facing ships

4. **Generate positions 9-23** (lines 676-684): 180° rotation
   - Rotates by 180° to create down-facing ships
   - Simple vertical flip of existing positions

### Rotation Symmetry
- The algorithm exploits symmetry to generate 32 positions from just 5 base images
- Each quadrant (8 positions) is derived from transformations of the base 5
- Positions 0-7: Up to right (base + 90° rotations)
- Positions 8-15: Right to down (180° of 0-7)
- Positions 16-23: Down to left (180° of 8-15)
- Positions 24-31: Left to up (270° rotations)

### Bit Manipulation Functions
- `get_bit()` (Figs.c:719-740): Reads individual pixels from source position
- `put_bit()` (Figs.c:695-711): Sets individual pixels in destination position
- Both work directly with the bitmap data as arrays of bytes

### Position Variables (Play.c:14-16)

- `shipx, shipy`: Screen coordinates of ship center
- `globalx, globaly`: World coordinates of ship center
- `shiprot`: Current rotation (0-31, representing 32 discrete angles)
- `SCENTER = 15`: Offset from ship center to top-left corner (GW.h)

## Background Pattern System

### Pattern Definition (Play.c:68-69)

```c
long backgr1 = 0xAAAAAAAAL,  // Binary: 10101010...
     backgr2 = 0x55555555L;  // Binary: 01010101...
```

### Pattern Application (Draw.c:1439-1458 in `view_clear`)

- Even rows use `backgr1` (0xAAAAAAAA)
- Odd rows use `backgr2` (0x55555555)
- Creates checkerboard "gray" appearance
- Note: On Mac, 1 = black pixel, 0 = white pixel

## Rendering Process

The ship is drawn in `move_and_display()` (Play.c:219-286) using a precise sequence:

### 1. Screen Clear (Play.c:251)

```c
view_clear(back_screen);
```

- Fills entire screen with checkerboard background pattern
- Sets up `background[0]` and `background[1]` for current screen position

### 2. Non-Lethal Objects (Play.c:253-254)

```c
do_fuels();
draw_craters();
```

- Draws fuel cells and crater marks
- These will not cause ship destruction

### 3. Shadow Setup - `gray_figure()` (Play.c:256-258)

```c
gray_figure(shipx-(SCENTER-8), shipy-(SCENTER-5),
            ship_masks[shiprot], SHIPHT);
```

- **Position**: (shipx+7, shipy+10) - offset 8 pixels right, 5 pixels down
- **Function** (Draw.c:150-183):
  - Takes ship mask and ANDs with checkerboard pattern
  - ORs result to screen
  - Creates checkerboard pixels in ship shape at shadow location
- **Assembly detail** (Draw.c:175-178):
  ```asm
  and.l gray, D0   ; AND mask with gray pattern
  or.l  D0, (A0)   ; OR to screen
  ```

### 4. Terrain Drawing (Play.c:260-261)

```c
white_terrain();
black_terrain(L_GHOST);
```

- White terrain (all 0s) overwrites any gray pixels where it draws

### 5. Ship Collision Hole (Play.c:263-264)

```c
erase_figure(shipx-SCENTER, shipy-SCENTER, ship_masks[shiprot], SHIPHT);
```

- **Purpose**: Creates ship-shaped hole for collision detection (see COLLISION.md)
- Not part of visual rendering

### 6. More Terrain and Objects (Play.c:266-270)

```c
check_for_bounce();
black_terrain(L_NORMAL);
- This also draws some white pixels (not withstanding the name)
do_bunkers();
```

### 7. Shadow Rendering - `shift_figure()` (Play.c:275-276)

```c
shift_figure(shipx-(SCENTER-8), shipy-(SCENTER-5),
             ship_masks[shiprot], SHIPHT);
```

- **Position**: Same as `gray_figure()` - (shipx+7, shipy+10)
- **Function** (Draw.c:219-254):
  - Reads ship mask
  - ANDs with screen contents (gets the gray pixels from step 3)
  - Shifts result left by 1 pixel (line 227: `addq.w #1, x`)
  - ORs shifted result back to screen
- **Assembly detail** (Draw.c:232-237):
  ```asm
  and.l (A0), D0      ; AND mask with screen
  roxl.l #1, D0       ; Rotate left (shift by 1)
  or.l  D0, (A0)      ; OR to screen
  ```

### 8. Ship Drawing - `full_figure()` (Play.c:277-278)

```c
full_figure(shipx-SCENTER, shipy-SCENTER,
            ship_defs[shiprot], ship_masks[shiprot], SHIPHT);
```

- **Position**: Actual ship position (shipx-15, shipy-15)
- **Function** (Draw.c:163-182):
  - Uses mask to clear ship-shaped area (NOT + AND)
  - Uses ship_defs to draw actual sprite (OR)
- **Result**: Final ship sprite rendered on top

## The Shadow Effect Explained

The clever shadow technique works through bit manipulation:

### Initial State After `gray_figure()`:

```
Shadow position has checkerboard pattern in ship shape:
Row 0: 1010101010...
Row 1: 0101010101...
Row 2: 1010101010...
```

### After `shift_figure()` Shifts Left by 1:

```
Shifted pattern:
Row 0: 0101010101...
Row 1: 1010101010...
Row 2: 0101010101...
```

### When ORed with Original Checkerboard:

```
Original: 1010101010...
Shifted:  0101010101...
OR Result: 1111111111... = SOLID BLACK
```

The shifted black pixels land exactly on white pixels, creating solid black when ORed together.

### Why Shadow Only Appears on Background:

1. `gray_figure()` creates checkerboard pixels early in rendering
2. White terrain (all 0s) overwrites these pixels where it draws
3. `shift_figure()` can only create shadow where gray pixels remain
4. On white terrain: AND with 0s gives 0s, shift gives 0s, OR with 0s stays white

## Total Shadow Offset

The complete shadow offset is approximately (9, 5) pixels:

- Base offset: (8, 5) from position parameters
- Additional shift: 1 pixel from `shift_figure()`
- Creates convincing depth effect

## Key Insights

1. **No True Gray**: The Mac has only black/white pixels. "Gray" is an optical illusion from the checkerboard pattern.

2. **Bit Manipulation Magic**: The shift-and-OR technique converts dithered pattern to solid black.

3. **Rendering Order Matters**: White terrain must be drawn between `gray_figure()` and `shift_figure()` for the masking to work.

4. **Performance**: All operations use fast bitwise instructions optimized for 68000 processor.

5. **Fixed Shadow Direction**: Shadow always appears down-right, regardless of ship rotation or movement.

## Function Reference

### `gray_figure()` (Draw.c:150-183)

- Draws checkerboard pattern masked by sprite shape
- Used to set up shadow pixels

### `shift_figure()` (Draw.c:219-254)

- Reads pixels, shifts left by 1, draws as black
- Converts dithered shadow setup into solid black shadow

### `full_figure()` (Draw.c:163-182)

- Standard sprite drawing with transparency mask
- Draws the actual ship graphics

### `erase_figure()` (Draw.c:67-97)

- Clears pixels using mask shape
- Used for collision detection setup, not visual rendering

