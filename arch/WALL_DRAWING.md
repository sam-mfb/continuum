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
