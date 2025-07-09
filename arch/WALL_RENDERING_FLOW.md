# Wall Rendering Flow in Continuum

This document describes the functions involved in wall rendering, their purposes, and the call flow during each frame.

## Function Directory

### Junctions.c Functions

#### Initialization Functions (Called Once Per Level)

**init_walls()**

- Main initialization entry point
- Organizes walls into linked lists by type (normal, bouncing, phantom)
- Creates special firstwhite list for NNE walls only
- Detects all wall intersections (junctions)
- Sorts junctions by x-coordinate
- Calls init_whites() to prepare white pieces

**init_whites()**

- Prepares all white shadow pieces for the level
- Calls norm_whites() to add standard white pieces
- Calls close_whites() to calculate junction patches
- Sorts white pieces by x-coordinate
- Merges overlapping whites
- Calls white_hash_merge() to add crosshatch patterns

**norm_whites()**

- Adds standard white shadow pieces for each wall endpoint
- Adds special glitch-fixing pieces for NE, ENE, and ESE walls
- Uses predefined bit patterns from whitepicts array

**close_whites()**

- Finds walls that come within 3 pixels of each other
- Calls one_close() for each close pair to calculate patches
- Sets h1 and h2 values on walls to optimize drawing

**one_close()**

- Fills gaps in white shadow coverage where walls meet
- Giant switch statement handling 64 possible junction combinations
- Modifies wall h1/h2 values to avoid drawing conflicts
- Adds triangular/rectangular patches to ensure complete coverage

**white_hash_merge()**

- Adds decorative 6x6 crosshatch texture at junctions
- Makes junction seams less visually obvious
- Converts solid white pieces to textured ones using XOR patterns

#### Drawing Functions (Called Each Frame)

**fast_whites()**

- Draws all visible white shadow pieces
- Uses optimized assembly loop with pre-sorting
- Calls white_wall_piece() for normal whites
- Calls eor_wall_piece() for whites with hash patterns
- Handles world wrapping with two passes

**white_wall_piece()**

- Draws a single white piece using AND operations
- Handles clipping at screen edges
- Uses bit patterns to create shadow effect

**eor_wall_piece()**

- Draws a white piece with XOR operations
- Used for pieces that have hash patterns
- Preserves background texture through junction

**fast_hashes()**

- Draws crosshatch patterns at visible junctions
- Uses optimized inline assembly for common cases
- Calls draw_hash() for edge cases

**draw_hash()**

- Draws a single 6x6 pixel crosshatch pattern
- Handles clipping at screen boundaries

### Walls.c Functions

#### Wall Type Drawing Functions

Each wall type has a black drawing function that renders the top surface:

**south_black()** - Draws vertical walls
**sse_black()** - Draws nearly vertical walls with slight slope
**se_black()** - Draws 45-degree diagonal walls
**ese_black()** - Draws mostly horizontal walls with slight slope
**east_black()** - Draws horizontal walls (uses combined white+black when no junctions)
**ene_black()** - Draws mostly horizontal walls with upward slope (always calls ene_white() first)
**ne_black()** - Draws 45-degree diagonal upward walls (combines white end pieces)
**nne_black()** - Draws nearly vertical walls with upward slope

Some wall types also have separate white drawing functions:

**nne_white()** - Special white drawing for NNE walls
**ene_white()** - White drawing for ENE walls (called from ene_black)

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

- Main function for drawing white shadows
- Calls fast_whites() for optimized white drawing
- Calls fast_hashes() for junction patterns
- Draws special NNE whites that need separate handling
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
                  │   │ norm_whites()│ -> Add standard white pieces
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
                      │ white_hash_merge() │ -> Add hash patterns
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
         │            │   │ fast_whites()│ -> Draw all white pieces
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
         │            └─> Draw special NNE whites
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

The two-phase approach ensures proper 3D appearance:

1. All white shadows are drawn first (back to front)
2. All black tops are drawn second (also back to front)
3. This prevents black tops from being overwritten by white shadows

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

### Combined White+Black Drawing

While most walls use separated drawing (all whites first, then all blacks), some wall types optimize by combining both phases:

**When Combined Drawing Happens:**

1. **East walls** - When no junctions interfere (checked via h1/h2 values)
2. **ENE walls** - Always combined (ene_white() called from ene_black())
3. **NE walls** - White end pieces drawn inline with black
4. **ESE walls** - Helper functions combine some drawing

**Why These Cases?**

- Performance: Touch each memory location only once
- Geometric simplicity: Horizontal/near-horizontal patterns are simpler
- No junction conflicts: Only when h1/h2 values indicate safe regions

**The Decision Logic:**

- close_whites() sets h1/h2 values on each wall
- These values mark "safe" regions without junctions
- Drawing functions check these to decide on optimization

### Why NNE Walls Are Special

NNE (North-Northeast) walls are the only wall type that requires completely separated white drawing:

**The Overlap Problem:**

- NNE walls slope upward to the right
- The white shadow needs to appear at the bottom-left
- The black top extends down and to the left
- This creates an overlap area where black would incorrectly cover white

**Visual Example:**

```
      ██  <- Black top
     ██░  <- Overlap area (problem!)
    ██░░  <- White shadow
   ░░░░
```

**Special Handling:**

1. NNE walls are added to a separate `firstwhite` list during initialization
2. They are the ONLY wall type in this special list
3. Their whites are drawn during white_terrain() via nne_white()
4. This happens BEFORE any black drawing begins
5. Unlike ENE or East walls, NNE can NEVER use combined drawing

**Why This Design:**
The upward-right slope creates geometry where standard drawing would fail. By forcing complete separation and drawing NNE whites in the white phase, the game ensures the white shadow is visible before the black top overwrites the overlap area.

### World Wrapping

The cylindrical world requires drawing walls twice:

1. First pass: Draw at normal position
2. Second pass: Draw wrapped around if player is near world edge
   This is why most drawing functions have a second loop after `right -= worldwidth`
