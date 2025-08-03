# Fuel Cells and Craters

This document describes how fuel cells and craters are implemented in the original Continuum game, based on analysis of the 68K Mac source code.

## Fuel Cells

### Data Structure

- Stored in `fuelrec fuels[NUMFUELS]` array (defined in Terrain.c:14)
- Each fuel cell contains:
  - `x, y`: Position coordinates
  - `alive`: Boolean state
  - `currentfig`: Current animation frame
  - `figcount`: Frame counter for animation timing

### Initialization and Loading

1. **Level Loading** (Main.c `get_planet()` function):

   - Fuel cell positions are read from the level file
   - Positions loaded into the `fuels` array (Main.c:808-815)
   - Cells with coordinates > 4000 are marked as end-of-list (x = 10000)
   - Final fuel cell marked with x = 20000 as terminator

2. **Planet Initialization** (`init_planet()` in Play.c:148-153):
   - All fuel cells set to `alive = TRUE`
   - Each cell gets random animation frame: `currentfig = rint(FUELFRAMES)`
   - Each cell gets random frame counter: `figcount = rint(FUELFCYCLES)`

### Rendering Process

1. **Animation Update** (`do_fuels()` in Terrain.c:267-290):

   - Called each frame from `move_and_display()`
   - Random "flash" effect: one random fuel cell per frame flashes bright
   - Normal cells cycle through animation frames
   - Frame counter decrements, advances to next frame when it reaches 0

2. **Drawing** (`draw_fuels()` in Terrain.c:293-313):
   - Iterates through all fuel cells with valid positions (x < 10000)
   - Only draws cells within screen bounds
   - Uses alternating fuel images based on position: `(x + y) & 1`
   - Handles world wrapping for cells near screen edges
   - Uses `draw_medium()` to render the fuel cell sprite

### Collection Mechanics

- Collection happens in `ship_control()` when shield is active (Play.c:512-524)
- Process:
  1. Check if shield key is pressed and fuel > 0
  2. Scan all fuel cells for those within `FRADIUS` of ship
  3. For each cell in range:
     - Set `alive = FALSE`
     - Set `currentfig = FUELFRAMES` (final frame)
     - Add fuel to player: `fuel_minus(-FUELGAIN)`
     - Increase score: `score_plus(SCOREFUEL)`
     - Play fuel collection sound

## Craters

### Data Structure

- Stored in `craterrec craters[NUMCRATERS]` array (Terrain.c:15)
- Constants:
  - `NUMCRATERS = 50`: Maximum total craters
  - `NUMPRECRATS = 25`: Number of pre-placed craters from level data
- Each crater only stores: `x, y` position
- `numcraters`: Current count of active craters

### Initialization and Loading

1. **Level Loading** (Main.c `get_planet()`):

   - `numcraters` count read from level file (Main.c:768/852)
   - First 25 crater positions loaded from file (Main.c:817/895)
   - These are pre-placed craters defined in level design

2. **Dynamic Creation** (Play.c:359-362):
   - When rotating bunkers (`kind >= BUNKROTKINDS`) are destroyed:
     ```c
     craters[numcraters].x = bp->x;
     craters[numcraters].y = bp->y;
     numcraters++;
     ```
   - New crater created at destroyed bunker's position
   - Can add up to 25 more craters (50 total maximum)

### Rendering

- **Drawing** (`draw_craters()` in Terrain.c:507-527):
  - Called from `move_and_display()` each frame
  - Iterates through all craters from 0 to `numcraters`
  - Uses alternating crater images based on position: `(x + y) & 1`
  - Handles world wrapping for craters near screen edges
  - Uses `draw_medium()` to render crater sprites

### Key Characteristics

- **Permanence**: Craters cannot be removed once created
- **Mixed Origin**: Some from level data, others from gameplay
- **Visual Variety**: Alternating images create visual diversity
- **No State**: Craters are purely visual, no animation or interaction

## Summary of Differences

| Aspect             | Fuel Cells                 | Craters                           |
| ------------------ | -------------------------- | --------------------------------- |
| Positions          | All pre-defined in level   | First 25 pre-placed, rest dynamic |
| Can be removed     | Yes (collected)            | No (permanent)                    |
| Animation          | Yes (cycling frames)       | No                                |
| Player interaction | Yes (shield collection)    | No                                |
| Maximum count      | Fixed by level             | 50 total (25 pre + 25 dynamic)    |
| State tracking     | Position, alive, animation | Position only                     |
