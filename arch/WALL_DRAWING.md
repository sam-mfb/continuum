# Wall Drawing System in Continuum

This document explains the complex wall drawing system used in the original Continuum game, including how walls are rendered with 3D effects and how intersections (junctions) are handled.

## Plain English Summary: How Wall Drawing Works

Here's a step-by-step explanation of how Continuum draws its 3D-looking walls:

### The Basic Idea

Imagine each wall as a raised platform. To make it look 3D on a 2D screen, the game draws each wall in two layers:

1. First, a white "shadow" underneath (like the underside of a platform)
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
- **Find all junctions**: Locate every place where walls meet or come close (within 3 pixels)
- **Create white shadow pieces**: Generate the white "underside" pieces for each wall endpoint
- **Calculate junction patches**: Figure out special filler pieces to make junctions look clean
- **Identify optimization opportunities**: Mark which walls can use the faster combined drawing method
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

- **White phase first**:

  - Draw all white shadow pieces for visible walls
  - Add crosshatch patterns at junctions
  - Handle special cases (like NNE walls that need white-only treatment)

- **Black phase second**:
  - Draw black top surfaces based on wall type
  - Use optimized combined drawing where possible (no nearby junctions)
  - Process each wall category separately (phantom, bouncing, normal)
  - Handle world wrapping by drawing walls twice if needed

### Optimizations

The original game had several clever optimizations:

**Drawing Methods**:

1. **Separated method** (original): Draw ALL white parts first, then ALL black parts. Clean but slow because it touches each screen area twice.

2. **Combined method** (optimized): For simple walls without junctions, draw both white and black in one pass. Faster but more complex code. For example, `east_black()` draws horizontal walls in one go.

**Visibility Checks**:

- Pre-sorting walls means the game can stop checking as soon as it finds a wall that starts beyond the right edge of the screen
- Individual wall drawing functions clip their output to only draw the visible portion
- This was crucial for 1980s hardware - no CPU cycles wasted on invisible pixels

### Why So Complex?

The complexity comes from several factors:

- **Eight wall directions**: Each direction (vertical, horizontal, diagonals, and in-between angles) needs different drawing patterns

- **Junction handling**: With 8 directions, there are 64 possible ways walls can meet. Each combination might need special patches to look right.

- **Performance**: On 1980s hardware, every optimization mattered. The code uses assembly language and bit manipulation tricks.

- **Visual quality**: The developers wanted pixel-perfect junctions with no gaps or overlaps, requiring careful hand-tuning of each case.

### The Key Insight

Rather than trying to calculate 3D graphics in real-time (too slow for 1980s computers), the game uses pre-made bit patterns for each wall type and junction combination. It's like having a box of perfectly-shaped puzzle pieces - the game just needs to put the right pieces in the right places.
