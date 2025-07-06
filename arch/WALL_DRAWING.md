# Wall Drawing System in Continuum

This document explains the complex wall drawing system used in the original Continuum game, including how walls are rendered with 3D effects and how intersections (junctions) are handled.

## Plain English Summary: How Wall Drawing Works

Here's a step-by-step explanation of how Continuum draws its 3D-looking walls:

### The Basic Idea

Imagine each wall as a raised platform. To make it look 3D on a 2D screen, the game draws each wall in two layers:
1. First, a white "shadow" underneath (like the underside of a platform)
2. Then, a black "top surface" on top

This creates the illusion that walls stick up from the playing field.

### The Process

#### 1. **Game Startup - Preparing the Walls**

When a level loads, the game does several preparation steps:

- **Organize walls by type**: The game sorts all walls into groups based on their purpose (normal walls, bouncing walls, phantom walls). This is done by `init_walls()`.

- **Find intersections**: The game looks for places where walls meet or come close together (within 3 pixels). These spots are called "junctions" and need special handling to look right. Each junction's location is recorded.

- **Create white pieces**: For each wall, the game creates "white pieces" - the white shadow parts that go at the wall's start and end points. Different wall angles need different shadow shapes. This is done by `norm_whites()`.

- **Fix junction problems**: Where walls meet, the standard white pieces would overlap or leave gaps. The game calculates special "patch" pieces to fill these gaps cleanly. This complex process is handled by `close_whites()` and `one_close()`.

- **Sort and merge**: All white pieces are sorted by position for efficient drawing, and overlapping pieces are merged together.

#### 2. **During Gameplay - Drawing Each Frame**

Every time the screen updates, the game draws walls in this order:

- **Phase 1 - Draw all white parts** (`white_terrain()`):
  - Draw all the white shadow pieces calculated during startup
  - Add crosshatch patterns at junction points for visual detail
  - Handle special cases like NNE walls that need white-only drawing

- **Phase 2 - Draw all black parts** (`black_terrain()`):
  - Draw the black top surface of each wall type
  - Process phantom walls, bouncing walls, and normal walls separately
  - Handle screen wrapping for the cylindrical world

### Optimizations

The original game had two drawing methods:

1. **Separated method** (original): Draw ALL white parts first, then ALL black parts. Clean but slow because it touches each screen area twice.

2. **Combined method** (optimized): For simple walls without junctions, draw both white and black in one pass. Faster but more complex code. For example, `east_black()` draws horizontal walls in one go.

### Why So Complex?

The complexity comes from several factors:

- **Eight wall directions**: Each direction (vertical, horizontal, diagonals, and in-between angles) needs different drawing patterns

- **Junction handling**: With 8 directions, there are 64 possible ways walls can meet. Each combination might need special patches to look right.

- **Performance**: On 1980s hardware, every optimization mattered. The code uses assembly language and bit manipulation tricks.

- **Visual quality**: The developers wanted pixel-perfect junctions with no gaps or overlaps, requiring careful hand-tuning of each case.

### The Key Insight

Rather than trying to calculate 3D graphics in real-time (too slow for 1980s computers), the game uses pre-made bit patterns for each wall type and junction combination. It's like having a box of perfectly-shaped puzzle pieces - the game just needs to put the right pieces in the right places.

---

## Overview

The wall drawing system in Continuum creates a 3D effect by rendering each wall as two components:

1. **White part**: The "underside" or hidden face of the wall (drawn first)
2. **Black part**: The visible top edge/face of the wall (drawn second)

This two-part approach creates the illusion of depth, making walls appear three-dimensional on the 2D screen. The system is complicated by the need to handle intersections (junctions) where walls meet, which require special processing to avoid visual artifacts.

### Wall Types

The game supports 8 directional wall types based on their orientation:
- **S** (South) - Vertical
- **SSE** (South-Southeast) - Nearly vertical, slight rightward slope downward
- **SE** (Southeast) - 45-degree diagonal downward
- **ESE** (East-Southeast) - Mostly horizontal, slight downward slope
- **E** (East) - Horizontal
- **ENE** (East-Northeast) - Mostly horizontal, slight upward slope
- **NE** (Northeast) - 45-degree diagonal upward
- **NNE** (North-Northeast) - Nearly vertical, slight rightward slope upward

### Rendering Approaches

The system uses two different rendering approaches:

1. **Separated rendering** (original, slower): Draw all white parts first, then all black parts
2. **Combined rendering** (optimized, faster): Draw white and black parts of each wall together

As noted in `orig/Notes to Source`:
> "A general way to draw the walls is to draw all the white first, then draw the black tops afterward. This was done originally, but it's not as fast as doing both at once; the optimization is ugly, but was necessary. The white-then-black method is still used at some intersections."

## Code Flow and Architecture

### Initialization Phase

#### 1. Wall List Setup (`init_walls()` in `Junctions.c`)

```c
// Lines 34-96 in Junctions.c
init_walls()
{
    // Step 1: Organize walls by type into linked lists
    for (kind = L_NORMAL; kind < L_NUMKINDS; kind++)
    {
        for (line=lines; line->type; line++)
            if (line->kind == kind)
                *last = line;  // Add to kindptrs[kind] list
    }
    
    // Step 2: Build list of walls needing white-only drawing
    for (line=lines; line->type; line++)
        if (line->newtype == NEW_NNE)
            *last = line;  // Add to firstwhite list
    
    // Step 3: Detect and record junctions
    for (line=lines; line->type; line++)
        for (i=0; i<2; i++)  // Check both endpoints
        {
            // Find walls within 3 pixels (junction threshold)
            if (j->x <= x+3 && j->x >= x-3 &&
                j->y <= y+3 && j->y >= y-3)
                // Record junction
        }
    
    // Step 4: Initialize white pieces and patches
    init_whites();
}
```

#### 2. White Piece Initialization (`init_whites()` in `Junctions.c`)

```c
// Lines 199-242 in Junctions.c
init_whites()
{
    // Step 1: Add normal white undersides for each wall
    norm_whites();
    
    // Step 2: Calculate junction patches for close walls
    close_whites();
    
    // Step 3: Sort white pieces by x-coordinate for efficient rendering
    // (insertion sort implementation)
    
    // Step 4: Merge overlapping whites and apply hash patterns
    white_hash_merge();
}
```

### Drawing Phase

The main drawing flow happens in `Play.c` during the game loop:

#### 1. White Drawing Phase (`white_terrain()` in `Terrain.c`)

```c
// Lines 86-117 in Terrain.c
white_terrain()
{
    // Draw all white pieces including junction patches
    fast_whites();  // Junctions.c:634-706
    
    // Draw hash patterns at junction points
    fast_hashes();  // Junctions.c:822-912
    
    // Handle walls that need special white-only treatment
    for (p = firstwhite; p && p->endx < left; p = p->nextwh)
        WHITE_LINE_Q(p, screenx, screeny);
}
```

#### 2. Black Drawing Phase (`black_terrain()` in `Terrain.c`)

```c
// Lines 46-83 in Terrain.c
black_terrain(thekind)
{
    // Process walls of specified type (L_PHANTOM, L_BOUNCING, or L_NORMAL)
    for(p = kindptrs[thekind]; p && p->startx < right; p = p->next)
        if (/* wall is visible on screen */)
            BLACK_LINE_Q(p, screenx, screeny);
    
    // Handle world wrapping (second pass)
    right -= worldwidth;
    // Repeat for wrapped walls
}
```

### Junction Handling

#### Junction Detection (`init_walls()` in `Junctions.c`, lines 63-83)

Junctions are detected by finding wall endpoints within 3 pixels of each other:

```c
for (j=junctions; j < lastj; j++)
    if (j->x <= x+3 && j->x >= x-3 &&
        j->y <= y+3 && j->y >= y-3)
        break;  // Junction found
```

#### Junction Patch Calculation (`one_close()` in `Junctions.c`, lines 334-565)

This function handles the complex logic of determining what white patches to add when walls intersect:

```c
one_close(line, line2, n, m)
{
    // Calculate relative directions of intersecting walls
    dir1 = 9 - line->newtype;
    dir2 = 9 - line2->newtype;
    
    // Giant switch statement handles each combination
    switch(dir1)
    {
        case 0:  // South wall
            switch (dir2)
            {
                case 15:  // Meets NNE wall
                case 1:   // Meets SSE wall
                    i = 21;  // Height of patch needed
                    break;
                // ... many more cases
            }
            // Add or replace white patch
            add_white_2(line->startx, line->starty + j,
                       line->endx, line->endy - i, i, npatch);
    }
}
```

## Example: T-Junction Rendering

Let's trace through a concrete example of two walls forming a T-junction.

### Setup
- **Wall A**: Horizontal (E type) from (100, 50) to (150, 50)
- **Wall B**: Vertical (S type) from (125, 30) to (125, 70)
- **Junction**: Forms at (125, 50)

### Step 1: Initialization

During `init_walls()`:

1. Wall detection and sorting:
   ```
   kindptrs[L_NORMAL] = Wall A → Wall B → NULL  (sorted by x)
   ```

2. Junction detection:
   ```
   junctions[0] = {x: 125, y: 50}
   numjunctions = 1
   ```

3. White initialization in `norm_whites()`:
   ```
   whites[0] = {x: 100, y: 50, ht: 6, data: eleft}     // Wall A start
   whites[1] = {x: 150, y: 50, ht: 6, data: eright}    // Wall A end
   whites[2] = {x: 125, y: 30, ht: 6, data: stop}      // Wall B start
   whites[3] = {x: 125, y: 70, ht: 6, data: sbot}      // Wall B end
   ```

4. Junction patch calculation in `close_whites()`:
   ```
   // one_close() determines Wall A and B need a patch at intersection
   whites[4] = {x: 125, y: 50, ht: 6, data: special_patch}
   ```

### Step 2: Drawing

1. **White Phase** (`fast_whites()`):
   ```
   Draw whites[0] through whites[4]
   Result: All white undersides plus junction patch
   
   Visual (simplified):
   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ← Wall A white
           ░░
           ░░                      ← Wall B white
           ##                      ← Junction patch
           ░░
           ░░
   ```

2. **Hash Phase** (`fast_hashes()`):
   ```
   At junction (125, 50), apply crosshatch pattern
   ```

3. **Black Phase** (`black_terrain(L_NORMAL)`):
   ```
   Draw Wall A black: ████████████████████████████████
   Draw Wall B black:         ██
                              ██
                              ██
                              ██
   ```

### Final Result
```
        ████████████████████████████████  ← Black top
        ░░░░░░░░░░░██░░░░░░░░░░░░░░░░░░  ← White underside
                    ##                     ← Junction properly handled
                    ██
                    ██
```

## Example: Combined White/Black Drawing (East Wall)

For walls without nearby junctions, the optimized combined drawing method is used. Here's how it works for a simple horizontal (East) wall:

### Setup
- **Wall**: Horizontal (E type) from (50, 100) to (200, 100)
- **No junctions nearby**: Can use fast path

### Code Flow

The `east_black()` function (`Walls.c:577-725`) handles both white and black drawing:

```c
void east_black(line, scrx, scry)
{
    // Step 1: Calculate visible segments
    h1 = 0;                    // Start of wall
    h2 = 16;                   // Start of main black section
    h3 = line->h2;            // End of main black section  
    h4 = line->length+1;      // End of wall
    
    // Step 2: Draw white end pieces (if needed)
    if (h2 > h1)
        draw_eline(x+h1, y, h2 - h1 - 1, L_DN);  // Left white stub
    if (h4 > h3)
        draw_eline(x+h3, y, h4 - h3 - 1, L_DN);  // Right white stub
    
    // Step 3: Draw main section (combined white and black)
    // Using optimized assembly for horizontal line:
    @quicklp:
        move.l  D1, (A0)        // Black pixels (top 2 lines)
        move.l  D1, 64(A0)      
        move.l  D0, 64*2(A0)    // White pixels (bottom 4 lines)
        move.l  D0, 64*3(A0)
        move.l  D0, 64*4(A0)
        move.l  D0, 64*5(A0)
}
```

### Visual Result

The function draws this pattern in one pass:
```
████████████████████████████████  ← Black (D1 = all 1s)
████████████████████████████████  
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ← White (D0 = all 0s)
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

### Performance Benefits

1. **Single pass**: Memory for each wall section accessed only once
2. **Cache efficiency**: All pixels for a vertical slice drawn together
3. **Minimal calculations**: Simple bit patterns (all 1s or 0s) for horizontal walls
4. **Assembly optimization**: Unrolled loops for common cases

### Contrast with ENE Wall

For comparison, the `ene_black()` function (`Walls.c:341-349`) shows a different approach:

```c
void ene_black(line, scrx, scry)
{
    // This wall type has complex white patterns
    // So it calls the white function first
    ene_white(line, scrx, scry);
    
    // Then continues with black drawing...
}
```

This demonstrates that the drawing method choice depends on the wall's complexity and whether it has junctions nearby.

## Special Cases and Optimizations

### White Piece Types

The system uses predefined bit patterns for different white pieces (`Junctions.c`, lines 98-127):

```c
int *whitepicts[][2] =
{
    {NULL, NULL},
    {generictop, sbot},      // S wall whites
    {ssetop, ssebot},        // SSE wall whites
    {setop, sebot},          // SE wall whites
    {NULL, eseright},        // ESE wall whites
    {eleft, generictop},     // E wall whites
    {eneleft, generictop},   // ENE wall whites
    {nebot, generictop},     // NE wall whites
    {nnebot, generictop}     // NNE wall whites
};
```

### Glitch Patches

Special patches fix specific visual artifacts (`Junctions.c`, lines 100-103):
- `neglitch[4]` - Fixes NE wall intersections
- `eneglitch1[3]`, `eneglitch2[5]` - Fixes ENE wall intersections
- `eseglitch[4]` - Fixes ESE wall intersections

### Performance Optimizations

1. **Spatial sorting**: Walls sorted by x-coordinate enable early loop termination
2. **Clipping masks**: `LEFT_CLIP`, `RIGHT_CLIP`, `CENTER_CLIP` avoid per-pixel boundary checks
3. **Assembly routines**: Critical drawing loops implemented in 68000 assembly
4. **Bit manipulation**: Extensive use of bitwise operations for pattern rendering

## Key Data Structures

### Wall Record (`linerec` in `GW.h`)
```c
typedef struct linerec {
    int type;       // Wall type for physics
    int kind;       // L_NORMAL, L_BOUNCING, L_PHANTOM
    int newtype;    // NEW_S through NEW_NNE
    int startx, starty, endx, endy;
    int length;
    int h1, h2;     // Modified during junction processing
    struct linerec *next;     // Type list linkage
    struct linerec *nextwh;   // White-only list linkage
} linerec;
```

### Junction Record (`junctionrec` in `Junctions.c:20`)
```c
typedef struct {
    int x, y;
} junctionrec;
```

### White Piece Record (`whiterec` in `Junctions.c:131-135`)
```c
typedef struct {
    int x, y, hasj, ht;
    whitedata *data;  // Bit pattern for white piece
} whiterec;
```

## Summary

The wall drawing system in Continuum is a sophisticated solution to creating 3D-looking walls on 1980s hardware. Its complexity stems from:

1. The need to handle 64 possible junction combinations (8 directions × 8 directions)
2. Performance constraints requiring optimized assembly code
3. Visual quality requirements demanding pixel-perfect junction handling
4. The fundamental challenge of creating 3D effects with 2D bit patterns

The "ad-hoc and ugly" nature mentioned in the source comments reflects the reality that each junction type was likely debugged through trial and error, with specific patches added to fix visual artifacts as they were discovered during development.