# Screen Drawing System

This document describes how screen drawing and timing work in Continuum, based on the original 68K Mac source code in `orig/Sources/Play.c`.

## Frame Timing

The game runs at a fixed 20 FPS using the Mac's 60Hz system timer.

### Main Game Loop (Play.c:95-104)

```c
while( !endofplanet && !endofgame)
{
    move_and_display();    // Draw everything to back buffer
    wait_for_VR();         // Wait for timing
    swap_screens();        // Make back buffer visible
}
```

### Vertical Retrace Synchronization (Play.c:1169-1180)

```c
wait_for_VR()
{
    static long now=0;
    
    tickwait = TickCount() - now;
    if (tickwait > 20 || tickwait < 0) tickwait = 9;
    while(TickCount() < now + 3)    // Wait until 3 ticks have passed
        ;
    now = TickCount();
}
```

- `TickCount()` returns 60Hz ticks (1 tick = 16.67ms)
- Waits for minimum 3 ticks between frames (50ms = 20 FPS)
- `tickwait` measures frame performance for diagnostics

## Double Buffering

The game uses different double buffering strategies based on Mac model:

### Screen Type Detection (Play.c:1104-1120)

```c
init_screens()
{
    switch(Screen_Type)
    {
    case MACHINE_PLUS:  *change_screen |= 64;
                        showing_primary = TRUE;
    case MACHINE_SE30:  front_screen = primary_screen;
                        back_screen = secondary_screen;
                        break;
    case MACHINE_SMALL:
    case MACHINE_2:     front_screen = back_screen = secondary_screen;
                        break;
    }
}
```

### Mac Plus Hardware Page Flipping (Play.c:1139-1151)

- Two physical screen buffers: `primary_screen` and `secondary_screen`
- Switches between them by modifying memory-mapped register at `0xEFFFFE`
- Zero-copy operation - just changes which buffer is displayed

### Mac II/SE30 Screen Copying (Play.c:1126-1138)

```c
case MACHINE_2:
    CopyBits(&secondbmap, &game_window->portBits,
             &secondbmap.bounds, &game_window->portRect, srcCopy, NULL);
```

- Single visible screen buffer
- Draws to off-screen bitmap (`secondbmap`)
- Copies entire bitmap to window each frame

## Drawing Order

The `move_and_display()` function (Play.c:192-265) draws elements in a specific order:

1. **Clear back buffer** (line 219):
   ```c
   view_clear(back_screen);
   ```

2. **Background elements** (lines 221-222):
   - `do_fuels()` - Fuel depot animations
   - `draw_craters()` - Crater marks from destroyed bunkers

3. **Ship collision mask** (lines 224-226):
   ```c
   gray_figure(shipx-(SCENTER-8), shipy-(SCENTER-5),
               ship_masks[shiprot], SHIPHT);
   ```

4. **Terrain layers** (lines 228-236):
   - `white_terrain()` - White/visible walls
   - `black_terrain(L_GHOST)` - Ghost/transparent walls
   - `black_terrain(L_NORMAL)` - Normal black walls

5. **Game objects** (lines 237-259):
   - `do_bunkers()` - Enemy bunkers
   - `move_bullets()` - Enemy projectiles (unless shielding)
   - Ship sprite rendering
   - `move_shipshots()` - Player projectiles
   - Shield effect (if active)
   - `flame_on()` - Thrust flame
   - `draw_explosions()` - Explosion animations
   - `do_strafes()` - Strafe effects

6. **Status bar** (line 260):
   ```c
   update_sbar();
   ```

## Screen Coordinates

- **Screen dimensions**: 512×342 pixels total
- **Game view**: 512×318 pixels (VIEWHT = SCRHT - SBARHT)
- **Status bar**: 512×24 pixels at bottom

### Global Pointers (Play.c:57-59)

```c
char *front_screen, *back_screen,      // front and back screen pointers
     *primary_screen, *secondary_screen; // 1st and 2nd screens on this machine
```

- `front_screen`: Currently visible buffer
- `back_screen`: Buffer being drawn to
- Pointers swap each frame

## Performance Monitoring

The `tickwait` variable tracks frame timing (Play.c:49, 174-175):
- Measures ticks between frames
- Clamped to reasonable values (9 ticks) if out of range
- Displayed in debug mode (lines 262-263)

## Input Polling

Input is polled once per frame (Play.c:658-699):
- `GetKeys()` reads entire keyboard state into 16-byte array
- Processed during `ship_control()` before physics update
- Every 2 seconds, calls `GetNextEvent()` to prevent screensaver

## Screen Mode Support

The game adapts to different Macintosh models:
- **Mac Plus**: Hardware page flipping via memory-mapped I/O
- **Mac SE/30**: Software double buffering
- **Mac II**: Window-based rendering with CopyBits
- **Compact Macs**: Special handling for smaller screens