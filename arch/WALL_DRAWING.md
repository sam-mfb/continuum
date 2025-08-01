# Wall Drawing System in Continuum

## Key Files

orig/Sources/GW.h - data structures
orig/Sources/Junctions.c - key initialization routines, bitmap constants, assembly drawing routines
orig/Sources/Terrain.c - overall in game drawing scheme
orig/Sources/Walls.c - specific drawing routines

This document explains the complex wall drawing system used in the original Continuum game, including how walls are rendered with 3D effects and how intersections (junctions) are handled.

## Plain English Summary: How Wall Drawing Works

Here's a step-by-step explanation of how Continuum draws its 3D-looking walls:

### The Basic Idea

Imagine each wall as a raised platform. To make it look 3D on a 2D screen, each wall has two parts:

1. First, a white "underside" underneath (like the underside of a platform)
2. Then, a black "top surface" on top

This creates the illusion that walls stick up from the playing field.

### The Three-Step Process

The wall system works in three distinct steps:

1. **Organization** (at level start) - Prepare everything for fast drawing
2. **Selection** (each frame) - Figure out what's visible
3. **Drawing** (each frame) - Render the visible walls efficiently

Let's look at each step in detail:

#### Step 1: **Organization** (One-time setup when level loads)

This step prepares all the data structures for efficient rendering:

- **Categorize walls**: Sort walls into groups by their behavior type (normal, bouncing, phantom walls)
- **Sort by position**: Arrange walls by x-coordinate for fast visibility checking
- **Find all junctions**: Locate every place where walls end, deduplicating endings that are within 3px of each other
- **Create white shadow pieces**: Generate the white "underside" pieces for each wall endpoint
- **Calculate junction patches**: Figure out special filler pieces to make junctions look clean
- **Identify optimization opportunities**: Mark which parts of walls require more expensive XOR drawing and which can be drawing more simply
- **Merge and sort white pieces**: Combine overlapping pieces and sort for efficient access

#### Step 2: **Selection** (Every frame - find what's visible)

The game efficiently determines which walls need drawing:

- **Use viewport bounds**: Check against the player's current view area (512×318 pixels)
- **Exploit pre-sorting**: Since walls are sorted by x-position:
  - Skip past walls entirely to the left of the screen
  - Stop once we reach walls that start past the right edge
- **Check each candidate**: For walls that might be visible, verify they overlap the screen
- **Include margins**: Add small buffers (10 pixels horizontal, 6 vertical) to catch walls partially off-screen

#### Step 3: **Drawing** (Every frame - render the visible walls)

With the visible walls identified, render them in the correct order:

- **Fast phase first**:

  - Draw all pre-rendered pieces for visible walls
  - Add crosshatch patterns at junctions
  - Handle special cases (like NNE walls that need white-only treatment)

- **Complicated phase second**:
  - Use optimized combined drawing where possible (no nearby junctions) that draw white and black together
  - In areas requiring complex drawing use XOR operations
  - Process each wall category separately (phantom, bouncing, normal)
  - Handle world wrapping by drawing walls twice if needed

## Function Directory

### Junctions.c Functions

#### Initialization Functions (Called Once Per Level)

**init_walls()**

- Main initialization entry point
- Organizes walls into linked lists by type (normal, bouncing, phantom)
- Creates special firstwhite list for NNE walls only
- Detects all wall ends (junctions)
- Sorts junctions by x-coordinate
- Calls init_whites() to prepare white pieces

**init_whites()**

- Prepares all white underside pieces for the level (endpoints and junction patches only)
- Calls norm_whites() to add standard white pieces
- Calls close_whites() to calculate junction patches
- Sorts white pieces by x-coordinate
- Merges overlapping whites
- Calls white_hash_merge() to add crosshatch patterns

**norm_whites()**

- Adds standard white endpoint pieces for each wall endpoint
- Adds special glitch-fixing pieces for NE, ENE, and ESE walls
- Uses predefined bit patterns from whitepicts array

**close_whites()**

- Finds walls that come within 3 pixels of each other
- Calls one_close() for each close pair to calculate patches
- Sets h1 and h2 values on walls to mark areas where junctions affect drawing

**one_close()**

- Fills gaps in white underside coverage where walls meet
- Giant switch statement handling 64 possible junction combinations
- Modifies wall h1/h2 values to avoid drawing conflicts
- Adds triangular/rectangular patches to ensure complete coverage

**white_hash_merge()**

- Adds decorative 6x6 crosshatch texture at junctions
- Makes junction seams less visually obvious
- Sets the `hasj` field to TRUE for white pieces at junctions
- Modifies white data to include hash patterns mixed with background

#### Drawing Functions (Called Each Frame)

**fast_whites()**

- Draws ONLY white endpoint patches and junction pieces (NOT the main white undersides)
- Uses optimized assembly loop with pre-sorting
- Decision logic based on `hasj` field in whiterec structure:
  - If `hasj` is FALSE: Calls white_wall_piece() for normal AND drawing
  - If `hasj` is TRUE: Calls eor_wall_piece() for XOR drawing (junction pieces with hash patterns)
- Handles world wrapping with two passes

**white_wall_piece()**

- Draws a single white piece using AND operations
- Used for regular white pieces where `hasj` is FALSE
- Handles clipping at screen edges
- Uses bit patterns for endpoint patches

**eor_wall_piece()**

- Draws a white piece with XOR (EOR) operations
- Used for junction pieces where `hasj` is TRUE
- Required because these pieces have pre-mixed hash patterns
- XOR blending preserves background texture through junction

**fast_hashes()**

- Draws crosshatch patterns at visible junctions
- Uses optimized inline assembly for common cases
- Calls draw_hash() for edge cases

**draw_hash()**

- Draws a single 6x6 pixel crosshatch pattern
- Handles clipping at screen boundaries

### Walls.c Functions

#### Wall Type Drawing Functions

Each wall type has a drawing function that renders BOTH the white underside AND black top surface:

**south_black()** - Draws vertical walls (white underside via EOR masking + black top)
**sse_black()** - Draws nearly vertical walls with slight slope (white underside via EOR masking + black top)
**se_black()** - Draws 45-degree diagonal walls (white underside via EOR masking + black top)
**ese_black()** - Draws mostly horizontal walls with slight slope (white underside via EOR masking + black top)
**east_black()** - Draws horizontal walls (uses combined white+black when no junctions)
**ene_black()** - Draws mostly horizontal walls with upward slope (always calls ene_white() first)
**ne_black()** - Draws 45-degree diagonal upward walls (white underside via EOR masking + black top)
**nne_black()** - Draws nearly vertical walls with upward slope (black only - white drawn separately)

Some wall types have separate white drawing functions for their main undersides:

**nne_white()** - Draws the main white underside for NNE walls (called separately)
**ene_white()** - Draws the main white underside for ENE walls (called from ene_black)

#### Helper Functions

**draw_neline()** - Draws northeast-oriented line segments
**draw_nneline()** - Draws north-northeast line segments
**draw_eline()** - Draws east-oriented line segments
**eseline()** - Draws east-southeast line segments

### Terrain.c Functions

#### Main Drawing Orchestrators

**black_terrain()**

- Main function for drawing black wall tops
- Takes wall type parameter (phantom, bouncing, or normal)
- Finds visible walls using pre-sorted lists
- Calls BLACK_LINE_Q macro for each visible wall
- Handles world wrapping with second pass

**white_terrain()**

- Main function for drawing white elements
- Calls fast_whites() to draw endpoint and junction patches only
- Calls fast_hashes() for junction patterns
- Calls nne_white() for each visible NNE wall to draw its main white underside
- Handles world wrapping

## Rendering Flow Diagram

```
INITIALIZATION (Once per level)
┌─────────────┐
│ init_walls()│
└──────┬──────┘
       │
       ├─> Organize walls by type into linked lists
       ├─> Find all junctions (3-pixel threshold)
       ├─> Sort junctions by x-coordinate
       │
       └─> ┌──────────────┐
           │ init_whites()│
           └──────┬───────┘
                  │
                  ├─> ┌──────────────┐
                  │   │ norm_whites()│ -> Add white endpoint pieces
                  │   └──────────────┘
                  │
                  ├─> ┌───────────────┐
                  │   │ close_whites()│ -> Calculate junction patches
                  │   └───────┬───────┘
                  │           │
                  │           └─> ┌─────────────┐
                  │               │ one_close() │ -> Per-junction logic
                  │               └─────────────┘
                  │
                  ├─> Sort white pieces by x
                  ├─> Merge overlapping whites
                  │
                  └─> ┌────────────────────┐
                      │ white_hash_merge() │ -> Add hash patterns, set hasj flags
                      └────────────────────┘

RENDERING (Each frame)
┌─────────────────┐
│ Game Main Loop  │
└────────┬────────┘
         │
         ├─> Clear/prepare screen
         │
         ├─> ┌──────────────────┐
         │   │ white_terrain()  │
         │   └────────┬─────────┘
         │            │
         │            ├─> ┌──────────────┐
         │            │   │ fast_whites()│ -> Draw endpoint/junction patches
         │            │   └──────┬───────┘
         │            │          │
         │            │          ├─> white_wall_piece() [normal]
         │            │          └─> eor_wall_piece() [with hash]
         │            │
         │            ├─> ┌──────────────┐
         │            │   │ fast_hashes()│ -> Draw junction hashes
         │            │   └──────┬───────┘
         │            │          │
         │            │          └─> draw_hash() [edge cases]
         │            │
         │            └─> Draw NNE wall undersides via nne_white()
         │
         ├─> ┌────────────────────────┐
         │   │ black_terrain(PHANTOM) │ -> Draw phantom walls
         │   └────────────────────────┘
         │
         ├─> ┌────────────────────────┐
         │   │ black_terrain(BOUNCING)│ -> Draw bouncing walls
         │   └────────────────────────┘
         │
         ├─> ┌────────────────────────┐
         │   │ black_terrain(NORMAL)  │ -> Draw normal walls
         │   └────────┬───────────────┘
         │            │
         │            └─> BLACK_LINE_Q -> Calls appropriate function:
         │                                 - south_black()
         │                                 - sse_black()
         │                                 - se_black()
         │                                 - ese_black()
         │                                 - east_black()
         │                                 - ene_black()
         │                                 - ne_black()
         │                                 - nne_black()
         │
         └─> Continue with other game elements
```

## Key Design Decisions

### Why Separate White and Black Phases?

MISCONCEPTION: The rendering is NOT truly separated into white and black phases!

**What Actually Happens:**

1. White endpoint/junction patches are drawn first (via fast_whites)
2. Then each wall draws BOTH its white underside AND black top together
3. Exception: NNE walls have their white undersides drawn separately

This approach works because:

- Endpoint patches need to be drawn before walls to avoid overwrites
- Most walls efficiently draw white+black together using EOR masking
- The masking technique preserves background bits for white while setting others for black

### Why Multiple Wall Type Functions?

Each of the 8 wall directions requires different bit patterns and drawing logic:

- Vertical walls (S) use simple column drawing
- Horizontal walls (E) can use optimized horizontal fills
- Diagonal walls need complex bit shifting per scanline
- Each angle has unique intersection requirements

### Why Pre-sort Everything?

The 1980s hardware had very limited CPU power. Pre-sorting allows:

- O(n) visibility checking instead of O(n²)
- Early loop termination when walls go off-screen
- Efficient batching of similar operations
- Predictable memory access patterns

### Critical Requirement: Walls Must Be Sorted by X-Coordinate

**IMPORTANT:** The wall rendering system requires that walls are sorted by their `startx` coordinate in ascending order. This is not just an optimization - it's a hard requirement that the rendering code depends on.

**Evidence from QuickEdit.c:**

1. When creating new walls (lines 850-854), the editor maintains sort order:

   ```c
   while(i > 0 && lines[i].startx < lines[i-1].startx)
   {
       swapmem(lines+i, lines+i-1, sizeof(linerec));
       i--;
   }
   ```

2. When dragging objects (fuel/bunkers), similar sorting is performed to maintain order

3. The drawing code assumes this ordering when iterating through walls (line 158):
   ```c
   for (line=lines; line->startx < right; line++)
   ```

**Why This Matters:**

The `blackTerrain()` function has an optimization at line 55 that checks if the first wall in the linked list is visible:

```c
if (!p || p.startx >= right) {
    // First pass - nothing visible, but still need to check wrapped
}
```

If walls aren't sorted by `startx`, the first wall in the list might be off-screen to the right, causing this check to incorrectly skip rendering all walls, even those that are visible.

**Implementation Note:**

When creating walls programmatically (not loading from a planet file), you MUST sort them by `startx` before passing them to `initWalls()`. The `initWalls()` function preserves input order when building linked lists - it does NOT sort the walls itself.

### How Wall Drawing Actually Works

**The Key Insight:** Most walls draw their white undersides AND black tops together in a single pass!

**Standard Drawing Method (used by S, SSE, SE, ESE, NE walls):**

- Use EOR operations with carefully chosen bit masks
- The mask preserves certain bits from the gray background (creating white underside)
- The same operation sets other bits to create the black top
- Example: `eor = (background & 0xFFC00000) ^ 0xC0000000`
  - Top 10 bits preserved from background = white underside
  - Bits 10-11 set by XOR = black top

**Special Cases:**

- **EAST walls**: Can optimize further when h1/h2 indicate no junctions
- **ENE walls**: Call ene_white() then draw black
- **NNE walls**: Only wall type with truly separate white drawing

**Why This Design?**

- Single memory pass per wall = better performance
- EOR masking elegantly creates both colors
- Junction patches handled separately to avoid conflicts

## Background Pattern and Viewport Movement

**Critical Finding:** The wall rendering system depends on a fixed background pattern that remains consistent relative to world coordinates as the viewport moves. To avoid needing to actually check what is "under" the wall being drawn, the game uses a fixed pattern that represents the possible bits underneath the wall for a gray background. Crucially the game would alter/swap that pattern based on the actually screen position as explained here. This is because the gray background in Continuum was always fixed relative to absolute world position (which, by the way, is why the game is a little hard to watch on modern LCD screens, the constantly moving black/white crosshatch does not look good on LCDs)

### How the Background Works

1. **Pattern Definition**: Two alternating patterns are used:

   - `backgr1 = 0xAAAAAAAA` (binary: 10101010...)
   - `backgr2 = 0x55555555` (binary: 01010101...)

2. **Pattern Swapping in view_clear()**:

   ```c
   if ((screenx + screeny) & 1) {
       bgr1 = backgr2;
       bgr2 = backgr1;
   }
   else {
       bgr1 = backgr1;
       bgr2 = backgr2;
   }
   background[0] = bgr1;
   background[1] = bgr2;
   ```

   This critical step swaps the patterns based on viewport position. When the sum of viewport coordinates is odd, the patterns are swapped in the background array.

3. **Wall Drawing Pattern Selection**:

   ```c
   eor = (background[(x+y)&1] & MASK) ^ VALUE;
   ```

   Walls select patterns using screen coordinates (x, y) from the pre-swapped background array.

4. **Result**: The viewport-based swapping compensates for the screen coordinate-based selection, ensuring each world position always gets the same background pattern. Without this swapping, walls would appear to change patterns as the viewport moves.

### Implementation Note

When implementing visualization or rendering systems, the background pattern MUST be calculated based on world coordinates, not screen coordinates:

```typescript
// Correct:
const worldX = screenX + viewport.x
const worldY = screenY + viewport.y
if ((worldX + worldY) % 2 === 0) {
  // Draw pattern
}

// Incorrect:
if ((screenX + screenY) % 2 === 0) {
  // This would make the pattern move with the viewport!
}
```

This is essential for proper wall rendering, especially for junction hash patterns which are pre-calculated assuming specific background alignment.
