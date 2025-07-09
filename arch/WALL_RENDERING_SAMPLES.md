# White Bitmap Pattern Visualizations (As Rendered)

This file shows how the bitmap patterns actually appear when rendered in the game.
The original bits are used as AND masks, so 0 bits become white pixels.

Legend:

- □ = 1 bit (transparent - shows background texture)
- ■ = 0 bit (white pixel)

## White Shadow Piece Patterns

### GENERIC_TOP

Used by multiple wall types for their top/right white pieces.

```
0xFFFF: □□□□□□□□□□□□□□□□
0x3FFF: ■■□□□□□□□□□□□□□□
0x0FFF: ■■■■□□□□□□□□□□□□
0x03FF: ■■■■■■□□□□□□□□□□
0x00FF: ■■■■■■■■□□□□□□□□
0x007F: ■■■■■■■■■□□□□□□□

Visual effect: Creates a triangular white shadow extending left
```

### S_BOT (South Bottom)

```
0x803F: □■■■■■■■■■□□□□□□
0xC03F: □□■■■■■■■■□□□□□□
0xF03F: □□□□■■■■■■□□□□□□
0xFC3F: □□□□□□■■■■□□□□□□
0xFF3F: □□□□□□□□■■□□□□□□
0xFFFF: □□□□□□□□□□□□□□□□

Visual effect: Creates a triangular white shadow pointing up-right
```

### SSE_BOT (South-Southeast Bottom)

```
0x80FF: □■■■■■■■□□□□□□□□
0xC07F: □□■■■■■■■□□□□□□□
0xF07F: □□□□■■■■■□□□□□□□
0xFC3F: □□□□□□■■■■□□□□□□
0xFF3F: □□□□□□□□■■□□□□□□
0xFFFF: □□□□□□□□□□□□□□□□

Visual effect: Creates a white shadow angled for SSE walls
```

### SE_BOT (Southeast Bottom)

```
0x87FF: □■■■■□□□□□□□□□□□
0xC3FF: □□■■■■□□□□□□□□□□
0xF1FF: □□□□■■■□□□□□□□□□
0xFCFF: □□□□□□■■□□□□□□□□
0xFF7F: □□□□□□□□■□□□□□□□
0xFFFF: □□□□□□□□□□□□□□□□

Visual effect: Creates a steeper angled white shadow
```

### NE_BOT (Northeast Bottom)

```
0x8001: □■■■■■■■■■■■■■■□
0xC003: □□■■■■■■■■■■■■□□
0xF007: □□□□■■■■■■■■■□□□
0xFC0F: □□□□□□■■■■■■□□□□
0xFF1F: □□□□□□□□■■■□□□□□
0xFFFF: □□□□□□□□□□□□□□□□

Visual effect: Creates a wide white shadow for NE walls
```

### NNE_BOT (North-Northeast Bottom)

```
0x800F: □■■■■■■■■■■■□□□□
0xC01F: □□■■■■■■■■■□□□□□
0xF01F: □□□□■■■■■■■□□□□□
0xFC3F: □□□□□□■■■■□□□□□□
0xFF3F: □□□□□□□□■■□□□□□□
0xFFFF: □□□□□□□□□□□□□□□□

Visual effect: Creates a white shadow angled for NNE walls
```

### SSE_TOP (South-Southeast Top)

```
0xFFFF: □□□□□□□□□□□□□□□□
0xBFFF: □■□□□□□□□□□□□□□□
0xCFFF: □□■■□□□□□□□□□□□□
0xC3FF: □□■■■■□□□□□□□□□□
0xE0FF: □□□■■■■■□□□□□□□□
0xE03F: □□□■■■■■■■□□□□□□

Visual effect: Creates a small triangular white piece
```

### SE_TOP (Southeast Top)

```
0xFFFF: □□□□□□□□□□□□□□□□
0xFFFF: □□□□□□□□□□□□□□□□
0xEFFF: □□□■□□□□□□□□□□□□
0xF3FF: □□□□■■□□□□□□□□□□
0xF8FF: □□□□□■■■□□□□□□□□
0xFC3F: □□□□□□■■■■□□□□□□

Visual effect: Creates a diagonal white edge
```

### E_LEFT (East Left)

```
0xFFFF: □□□□□□□□□□□□□□□□
0xFFFF: □□□□□□□□□□□□□□□□
0xF000: □□□□■■■■■■■■■■■■
0xFC00: □□□□□□■■■■■■■■■■
0xFF00: □□□□□□□□■■■■■■■■
0xFF80: □□□□□□□□□■■■■■■■

Visual effect: Creates a horizontal white shadow on the left
```

### ENE_LEFT (East-Northeast Left)

```
0x8000: □■■■■■■■■■■■■■■■
0xC000: □□■■■■■■■■■■■■■■
0xF000: □□□□■■■■■■■■■■■■
0xFC01: □□□□□□■■■■■■■■■□
0xFF07: □□□□□□□□■■■■■□□□
0xFFDF: □□□□□□□□□□■□□□□□

Visual effect: Creates an angled white shadow
```

### ESE_RIGHT (East-Southeast Right)

```
0xFFFF: □□□□□□□□□□□□□□□□
0x3FFF: ■■□□□□□□□□□□□□□□
0x8FFF: □■■■□□□□□□□□□□□□
0xE3FF: □□□■■■□□□□□□□□□□
0xF8FF: □□□□□■■■□□□□□□□□
0xFE7F: □□□□□□□■■□□□□□□□

Visual effect: Creates a white shadow on the right side
```

## Glitch Fix Patterns

### NE_GLITCH

```
0xEFFF: □□□■□□□□□□□□□□□□
0xCFFF: □□■■□□□□□□□□□□□□
0x8FFF: □■■■□□□□□□□□□□□□
0x0FFF: ■■■■□□□□□□□□□□□□

Visual effect: Small white patch to fix NE wall glitches
```

### ENE_GLITCH1

```
0x07FF: ■■■■■□□□□□□□□□□□
0x1FFF: ■■■□□□□□□□□□□□□□
0x7FFF: ■□□□□□□□□□□□□□□□

Visual effect: White patch on left side
```

### ENE_GLITCH2

```
0xFF3F: □□□□□□□□■■□□□□□□
0xFC3F: □□□□□□■■■■□□□□□□
0xF03F: □□□□■■■■■■□□□□□□
0xC03F: □□■■■■■■■■□□□□□□
0x003F: ■■■■■■■■■■□□□□□□

Visual effect: Triangular white patch
```

### ESE_GLITCH

```
0x3FFF: ■■□□□□□□□□□□□□□□
0xCFFF: □□■■□□□□□□□□□□□□
0xF3FF: □□□□■■□□□□□□□□□□
0xFDFF: □□□□□□■□□□□□□□□□

Visual effect: Small white patches for ESE walls
```

## Junction Patterns

### HASH_FIGURE (6x6 Crosshatch)

This pattern is XORed, not ANDed, creating a crosshatch texture:

```
0x8000: □■■■■■■■■■■■■■■■  ╲
0x6000: ■□□■■■■■■■■■■■■■   ╲
0x1800: ■■■□□■■■■■■■■■■■    ╲
0x0600: ■■■■■□□■■■■■■■■■     ╲
0x0180: ■■■■■■■□□■■■■■■■      ╲
0x0040: ■■■■■■■■■□■■■■■■       ╲

Visual effect: Diagonal line pattern at junctions
```

### N_PATCH

All 22 values are 0x003F:

```
0x003F: ■■■■■■■■■■□□□□□□

Visual effect: White fill with right edge transparent
```

### NE_PATCH

```
0xE000: □□□■■■■■■■■■■■■■
0xC001: □□■■■■■■■■■■■■■□
0x8003: □■■■■■■■■■■■■■□□
0x0007: ■■■■■■■■■■■■■□□□

Visual effect: Diagonal white patch for NE junctions
```

### ENE_PATCH

```
0xFC00: □□□□□□■■■■■■■■■■
0xF003: □□□□■■■■■■■■■■□□
0xC00F: □□■■■■■■■■■■□□□□
0x003F: ■■■■■■■■■■□□□□□□

Visual effect: Angled white patch for ENE junctions
```

### E_PATCH

All 4 values are 0x0003:

```
0x0003: ■■■■■■■■■■■■■■□□

Visual effect: Mostly white with right edge transparent
```

### SE_PATCH

```
0x07FF: ■■■■■□□□□□□□□□□□
0x83FF: □■■■■■□□□□□□□□□□
0xC1FF: □□■■■■■□□□□□□□□□
0xE0FF: □□□■■■■■□□□□□□□□
0xF07F: □□□□■■■■■□□□□□□□
0xF83F: □□□□□■■■■■□□□□□□
0xFC1F: □□□□□□■■■■■□□□□□
0xFE0F: □□□□□□□■■■■■□□□□
0xFF07: □□□□□□□□■■■■■□□□
0xFF83: □□□□□□□□□■■■■■□□
0xFFC1: □□□□□□□□□□■■■■■□

Visual effect: Large diagonal white patch
```

### SSE_PATCH

```
0x00FF: ■■■■■■■■□□□□□□□□
0x00FF: ■■■■■■■■□□□□□□□□
0x807F: □■■■■■■■■□□□□□□□
0x807F: □■■■■■■■■□□□□□□□
0xC03F: □□■■■■■■■■□□□□□□
0xC03F: □□■■■■■■■■□□□□□□
0xE01F: □□□■■■■■■■■□□□□□
0xE01F: □□□■■■■■■■■□□□□□
0xF00F: □□□□■■■■■■■■□□□□
0xF00F: □□□□■■■■■■■■□□□□
0xF807: □□□□□■■■■■■■■□□□
0xF807: □□□□□■■■■■■■■□□□
0xFC03: □□□□□□■■■■■■■■□□
0xFC03: □□□□□□■■■■■■■■□□
0xFE01: □□□□□□□■■■■■■■■□
0xFE01: □□□□□□□■■■■■■■■□
0xFF00: □□□□□□□□■■■■■■■■
0xFF00: □□□□□□□□■■■■■■■■

Visual effect: Stepped diagonal white patch
```

## Understanding the 3D Effect

The white pieces create the illusion of 3D walls by:

1. **White shadows** appear below and to the left/right of walls
2. **Triangular shapes** suggest perspective and depth
3. **Junction patches** ensure complete white coverage at intersections
4. **Hash patterns** add texture to hide seams

The original game's background has a texture pattern, so the transparent areas (1 bits)
show this texture while the white areas (0 bits) create clean white shadows that make
the walls appear to cast shadows and have depth.
