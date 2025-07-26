# Continuum Collision Detection System

## Overview

The collision detection system in Continuum is a sophisticated pixel-perfect collision system that leverages the Mac's bitmap graphics architecture. The key function `check_figure` (Draw.c:227-273) performs collision detection by checking if any pixels of a collision mask would overlap with pixels already drawn on the screen.

**Important**: The game maintains separate visual sprites and collision masks. When checking collisions, it uses all-black mask versions of sprites (e.g., `ship_masks` instead of `ship_defs`), not the actual visual sprites. This is evident in Play.c:244 where collision detection uses `ship_masks[shiprot]` and Play.c:248-249 where drawing uses both `ship_defs` and `ship_masks`.

## How It Works

### Core Concept

The collision detection works by:
1. Taking a collision mask (32 pixels wide × height pixels tall) and screen position (x,y)
2. Checking each pixel of the mask against the corresponding screen memory region
3. Ignoring the background pattern (gray dithering) to avoid false positives
4. Returning TRUE if any mask pixel overlaps with a screen pixel, FALSE otherwise

The function essentially asks: "If I were to draw this 32×height pixel mask at position (x,y), would any of its black pixels overlap with black pixels already on screen at positions where the background pattern would be white?"

This subtle distinction is crucial - the function can only detect collisions at positions where the dithered background would normally show white pixels.

### Why Separate Masks?

The game stores both visual sprites and collision masks (defined in Figs.c:12-24) because:
- Visual sprites may have decorative elements that shouldn't cause collisions
- Masks can define a different collision boundary than the visual appearance
- All-black masks are simpler to process (no need to extract "solid" pixels)
- Allows for gameplay tuning independent of visual design

### The Background Pattern Problem

Continuum uses a dithered gray background pattern that alternates pixels in a checkerboard pattern:
```
Row 0: 10101010 10101010... (alternating pixels)
Row 1: 01010101 01010101... (opposite pattern)
Row 2: 10101010 10101010... (back to first pattern)
```

Without special handling, this would cause constant false collision detections because half the background pixels are "on" (black).

### The Brilliant Solution

The game uses an inverted masking technique:

1. **Two patterns are stored** (see Draw.c:25 and view_clear implementation at Draw.c:1439-1440):
   - `background[0]` = 0xAAAAAAAA (10101010... pattern)
   - `background[1]` = 0x55555555 (01010101... pattern)

2. **Key insight**: The pattern used for collision masking is the INVERSE of what's drawn on screen!
   - When row 0 has pattern 0xAAAA drawn, collision uses pattern 0x5555
   - When row 1 has pattern 0x5555 drawn, collision uses pattern 0xAAAA

3. **How it works:**
   ```
   back = background[1 - (y & 1)];  // Selects OPPOSITE pattern
   ```
   - Even rows (y & 1 = 0): uses background[1] for masking
   - Odd rows (y & 1 = 1): uses background[0] for masking

4. **The collision check:**
   ```asm
   and.l back, D0    ; First AND sprite with inverse background
   and.l (A0), D0    ; Then AND with screen content
   ```

### Why This Works

Consider checking a sprite pixel at different screen locations:

**Case 1: Sprite over background pixel**
- Sprite mask bit: 1
- Background mask bit: 0 (inverse of screen)
- Screen pixel: 1 (actual background)
- Step 1: sprite AND mask = 1 AND 0 = 0
- Step 2: result AND screen = 0 AND 1 = 0
- **Result: No collision (correct!)**

**Case 2: Sprite over empty background**
- Sprite mask bit: 1
- Background mask bit: 1 (inverse of screen)
- Screen pixel: 0 (empty background)
- Step 1: sprite AND mask = 1 AND 1 = 1
- Step 2: result AND screen = 1 AND 0 = 0
- **Result: No collision (correct!)**

**Case 3: Sprite over game object**
- Sprite mask bit: 1
- Background mask bit: 1 (this position would be empty in background)
- Screen pixel: 1 (actual game object)
- Step 1: sprite AND mask = 1 AND 1 = 1
- Step 2: result AND screen = 1 AND 1 = 1
- **Result: Collision detected (correct!)**

The inverse masking effectively filters out any collision with the dithered background while preserving collisions with actual game objects.

### Important Limitation

This approach has a subtle but important constraint: **collision detection only works for object pixels that align with white background positions**. Object pixels that happen to fall on black background positions are invisible to the collision system.

This means:
- A 1-pixel wide object aligned with black dither columns would be collision-invisible
- Thin objects could have "holes" in their collision detection
- The effective collision resolution is reduced by 50% due to the dither pattern

### Why This Works in Practice

This limitation doesn't affect gameplay because:
1. **All collidable objects are >2 pixels wide**: 
   - Ship: 32 pixels (SHIPWD in GW.h)
   - Bunkers: 48 pixels (BUNKWD in GW.h)  
   - Bullets: 4x4 pixels (draw_shipshot at Draw.c:620)
   - Terrain lines: 2+ pixels minimum thickness
2. **Objects span both dither patterns**: Any object 2+ pixels wide is guaranteed to have pixels on white background positions
3. **Moving objects**: The ship and bullets move continuously, ensuring they cross both pattern alignments
4. **Design constraint**: The game was likely designed with this limitation in mind

This is a clever engineering compromise - trading perfect collision detection for a simple, fast implementation that works well for the game's actual objects.

### Technical Implementation

1. **Bitmap Layout**: The Mac Plus screen is 512 pixels wide (SCRWTH in GW.h), stored as 64 bytes per row (8 pixels per byte)
2. **Sprite Format**: All sprites are exactly 32 pixels wide (hardcoded by the data format) but variable height
   - Stored as arrays of 32-bit integers (one per row)
   - Ship_Pic definition in GW.h: array of SHIPHT*2 integers (2 ints = 1 row of 32 pixels)
3. **Coordinate System**: Game logic tracks ship center, but drawing/collision expects top-left corner
   - `shipx-SCENTER, shipy-SCENTER` converts from center to top-left (Play.c:244)
   - SCENTER is likely 16 (half of 32-pixel width)
4. **Bit Shifting**: Sprites can be positioned at any pixel (not just byte boundaries)
   - Requires right-shifting sprite data by (x & 15) bits
   - Overflow bits are left-shifted into adjacent word
5. **Double Checking**: The algorithm checks a 48-pixel wide area
   - Main 32-bit word at calculated position
   - Additional 16-bit word (at offset +4) for overflow when sprite crosses word boundary

## Line-by-Line Analysis of check_figure

```c
/*	Check_Figure:  returns TRUE iff one of the figure's dots was
		already set.  Used to find collisions.
*/
int check_figure(x, y, def, height)
register int x, y;		// Top-left corner where sprite would be drawn
register int *def;		// Pointer to collision mask data (array of 32-bit words, one per row)
int height;			// Height of mask in pixels (width is always 32)
{
	register long back;	// Will hold the background pattern for masking
	
	// Select background pattern based on y position
	// The (1 - (y & 1)) inverts the least significant bit of y
	// This selects the INVERSE of the pattern drawn on screen
	// Even rows: background[1], Odd rows: background[0]
	back = background[1 - (y & 1)];
	
	// Adjust y to account for status bar at top of screen
	y += SBARHT;  // SBARHT = 25 pixels (GW.h)
	asm
	{	
		// Save D3 register as we'll use it as a counter
		movem.l	D3, -(SP)
		
		// Calculate screen memory address from x,y coordinates
		// This macro sets A0 to point to the screen buffer location
		JSR_WADDRESS  // Macro defined in "Assembly Macros.h"
		
		// Get bit position within word (0-15)
		andi.w	#15, x
		
		// Calculate left shift amount for overflow bits
		// If x=0, D2=16 (no overflow). If x=15, D2=1 (15 bits overflow)
		moveq	#16, D2
		sub.w	x, D2
		
		// Set up constants: 64 bytes per screen row
		moveq	#64, y
		
		// Set up loop counter for figure height
		move.w	height(A6), D3
		subq.w	#1, D3		// Adjust for dbf instruction
		
	@loop	// Main collision detection loop - process each row
		// Load next 32-bit word of mask data
		move.l	(def)+, D0
		
		// Skip this row if mask has no pixels here
		beq.s	@skip
		
		// Copy lower 16 bits for overflow handling
		move.w	D0, D1
		
		// Shift main data right by x pixels
		// This aligns mask with screen bit position
		lsr.l	x, D0
		
		// Shift overflow data left
		// These are the bits that wrapped to next word
		lsl.w	D2, D1
		
		// Mask with INVERSE background pattern to ignore dithering
		// This zeros out any sprite pixels that would overlap background
		// Only sprite pixels over non-background remain set
		and.l	back, D0
		and.w	back, D1
		
		// Check main 32-bit word against screen
		// If any mask pixel overlaps screen pixel, collision!
		and.l	(A0), D0
		bne.s	@collision	
		
		// Check overflow 16-bit word (4 bytes ahead)
		and.w	4(A0), D1
		bne.s	@collision
		
	@skip	// No collision on this row
		// Rotate background pattern for next row
		// This maintains the dither pattern alignment
		ror.l	#1, back
		
		// Move to next screen row (64 bytes)
		adda.l	y, A0
		
		// Continue loop for all mask rows
		dbf	D3, @loop
		
		// No collision detected in any row
		move.w	#FALSE, D0
		bra.s	@leave
		
	@collision
		// Collision detected!
		move.w	#TRUE, D0
		
	@leave
		// Restore saved register and return
		movem.l	(SP)+, D3
	}
}
```

## Why This System Is Clever

1. **Pixel-Perfect**: Unlike bounding box collision, this detects actual pixel overlaps
2. **Background Aware**: The dither pattern masking prevents false positives
3. **Efficient**: Uses bitwise operations and early exit on collision
4. **Memory Safe**: All drawing happens in pre-allocated screen buffers
5. **Hardware Optimized**: Written in assembly for maximum 68000 performance

## Usage in the Game

The game engine calls `check_figure` with collision masks (not visual sprites) to detect:
- Terrain collisions (Play.c:244 using `ship_masks[shiprot]`)
- Bunker collisions (bunkers are drawn directly with draw_bunker)
- Enemy shot collisions 
- Fuel cell pickups (fuel cells are drawn directly with draw_medium)

The typical pattern in Play.c is:
1. Calculate new position
2. Call `check_figure(x, y, ship_masks[shiprot], SHIPHT)` (Play.c:244)
3. If collision, handle it via `kill_ship()` (Play.c:245)
4. If no collision, use `full_figure` (Play.c:248-249) to draw ship with both visual sprite and mask

## Performance Considerations

- Early exit on first collision saves cycles
- Background pattern pre-calculated once per frame
- Register usage optimized for 68000 architecture
- Bit shifting operations are fast on 68000
- Memory access pattern is sequential for cache efficiency

This collision system is a masterpiece of low-level optimization that provides precise collision detection while working within the constraints of 1980s hardware.