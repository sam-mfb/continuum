# White Bitmap Pattern Visualizations

This file shows visual representations of all the bitmap patterns used for white shadow pieces and junction patches.

Legend:
- ■ = 1 (black/solid)
- □ = 0 (white/transparent)

## White Shadow Piece Patterns

### GENERIC_TOP
Used by multiple wall types for their top/right white pieces.
```
0xFFFF: ■■■■■■■■■■■■■■■■
0x3FFF: □□■■■■■■■■■■■■■■
0x0FFF: □□□□■■■■■■■■■■■■
0x03FF: □□□□□□■■■■■■■■■■
0x00FF: □□□□□□□□■■■■■■■■
0x007F: □□□□□□□□□■■■■■■■
```

### S_BOT (South Bottom)
```
0x803F: ■□□□□□□□□□■■■■■■
0xC03F: ■■□□□□□□□□■■■■■■
0xF03F: ■■■■□□□□□□■■■■■■
0xFC3F: ■■■■■■□□□□■■■■■■
0xFF3F: ■■■■■■■■□□■■■■■■
0xFFFF: ■■■■■■■■■■■■■■■■
```

### SSE_BOT (South-Southeast Bottom)
```
0x80FF: ■□□□□□□□■■■■■■■■
0xC07F: ■■□□□□□□□■■■■■■■
0xF07F: ■■■■□□□□□■■■■■■■
0xFC3F: ■■■■■■□□□□■■■■■■
0xFF3F: ■■■■■■■■□□■■■■■■
0xFFFF: ■■■■■■■■■■■■■■■■
```

### SE_BOT (Southeast Bottom)
```
0x87FF: ■□□□□■■■■■■■■■■■
0xC3FF: ■■□□□□■■■■■■■■■■
0xF1FF: ■■■■□□□■■■■■■■■■
0xFCFF: ■■■■■■□□■■■■■■■■
0xFF7F: ■■■■■■■■□■■■■■■■
0xFFFF: ■■■■■■■■■■■■■■■■
```

### NE_BOT (Northeast Bottom)
```
0x8001: ■□□□□□□□□□□□□□□■
0xC003: ■■□□□□□□□□□□□□■■
0xF007: ■■■■□□□□□□□□□■■■
0xFC0F: ■■■■■■□□□□□□■■■■
0xFF1F: ■■■■■■■■□□□■■■■■
0xFFFF: ■■■■■■■■■■■■■■■■
```

### NNE_BOT (North-Northeast Bottom)
```
0x800F: ■□□□□□□□□□□□■■■■
0xC01F: ■■□□□□□□□□□■■■■■
0xF01F: ■■■■□□□□□□□■■■■■
0xFC3F: ■■■■■■□□□□■■■■■■
0xFF3F: ■■■■■■■■□□■■■■■■
0xFFFF: ■■■■■■■■■■■■■■■■
```

### SSE_TOP (South-Southeast Top)
```
0xFFFF: ■■■■■■■■■■■■■■■■
0xBFFF: ■□■■■■■■■■■■■■■■
0xCFFF: ■■□□■■■■■■■■■■■■
0xC3FF: ■■□□□□■■■■■■■■■■
0xE0FF: ■■■□□□□□■■■■■■■■
0xE03F: ■■■□□□□□□□■■■■■■
```

### SE_TOP (Southeast Top)
```
0xFFFF: ■■■■■■■■■■■■■■■■
0xFFFF: ■■■■■■■■■■■■■■■■
0xEFFF: ■■■□■■■■■■■■■■■■
0xF3FF: ■■■■□□■■■■■■■■■■
0xF8FF: ■■■■■□□□■■■■■■■■
0xFC3F: ■■■■■■□□□□■■■■■■
```

### E_LEFT (East Left)
```
0xFFFF: ■■■■■■■■■■■■■■■■
0xFFFF: ■■■■■■■■■■■■■■■■
0xF000: ■■■■□□□□□□□□□□□□
0xFC00: ■■■■■■□□□□□□□□□□
0xFF00: ■■■■■■■■□□□□□□□□
0xFF80: ■■■■■■■■■□□□□□□□
```

### ENE_LEFT (East-Northeast Left)
```
0x8000: ■□□□□□□□□□□□□□□□
0xC000: ■■□□□□□□□□□□□□□□
0xF000: ■■■■□□□□□□□□□□□□
0xFC01: ■■■■■■□□□□□□□□□■
0xFF07: ■■■■■■■■□□□□□■■■
0xFFDF: ■■■■■■■■■■□■■■■■
```

### ESE_RIGHT (East-Southeast Right)
```
0xFFFF: ■■■■■■■■■■■■■■■■
0x3FFF: □□■■■■■■■■■■■■■■
0x8FFF: ■□□□■■■■■■■■■■■■
0xE3FF: ■■■□□□■■■■■■■■■■
0xF8FF: ■■■■■□□□■■■■■■■■
0xFE7F: ■■■■■■■□□■■■■■■■
```

## Glitch Fix Patterns

### NE_GLITCH
```
0xEFFF: ■■■□■■■■■■■■■■■■
0xCFFF: ■■□□■■■■■■■■■■■■
0x8FFF: ■□□□■■■■■■■■■■■■
0x0FFF: □□□□■■■■■■■■■■■■
```

### ENE_GLITCH1
```
0x07FF: □□□□□■■■■■■■■■■■
0x1FFF: □□□■■■■■■■■■■■■■
0x7FFF: □■■■■■■■■■■■■■■■
```

### ENE_GLITCH2
```
0xFF3F: ■■■■■■■■□□■■■■■■
0xFC3F: ■■■■■■□□□□■■■■■■
0xF03F: ■■■■□□□□□□■■■■■■
0xC03F: ■■□□□□□□□□■■■■■■
0x003F: □□□□□□□□□□■■■■■■
```

### ESE_GLITCH
```
0x3FFF: □□■■■■■■■■■■■■■■
0xCFFF: ■■□□■■■■■■■■■■■■
0xF3FF: ■■■■□□■■■■■■■■■■
0xFDFF: ■■■■■■□■■■■■■■■■
```

## Junction Patterns

### HASH_FIGURE (6x6 Crosshatch)
```
0x8000: ■□□□□□□□□□□□□□□□
0x6000: □■■□□□□□□□□□□□□□
0x1800: □□□■■□□□□□□□□□□□
0x0600: □□□□□■■□□□□□□□□□
0x0180: □□□□□□□■■□□□□□□□
0x0040: □□□□□□□□□■□□□□□□
```

### N_PATCH
All 22 values are 0x003F:
```
0x003F: □□□□□□□□□□■■■■■■
```

### NE_PATCH
```
0xE000: ■■■□□□□□□□□□□□□□
0xC001: ■■□□□□□□□□□□□□□■
0x8003: ■□□□□□□□□□□□□□■■
0x0007: □□□□□□□□□□□□□■■■
```

### ENE_PATCH
```
0xFC00: ■■■■■■□□□□□□□□□□
0xF003: ■■■■□□□□□□□□□□■■
0xC00F: ■■□□□□□□□□□□■■■■
0x003F: □□□□□□□□□□■■■■■■
```

### E_PATCH
All 4 values are 0x0003:
```
0x0003: □□□□□□□□□□□□□□■■
```

### SE_PATCH
```
0x07FF: □□□□□■■■■■■■■■■■
0x83FF: ■□□□□□■■■■■■■■■■
0xC1FF: ■■□□□□□■■■■■■■■■
0xE0FF: ■■■□□□□□■■■■■■■■
0xF07F: ■■■■□□□□□■■■■■■■
0xF83F: ■■■■■□□□□□■■■■■■
0xFC1F: ■■■■■■□□□□□■■■■■
0xFE0F: ■■■■■■■□□□□□■■■■
0xFF07: ■■■■■■■■□□□□□■■■
0xFF83: ■■■■■■■■■□□□□□■■
0xFFC1: ■■■■■■■■■■□□□□□■
```

### SSE_PATCH
```
0x00FF: □□□□□□□□■■■■■■■■
0x00FF: □□□□□□□□■■■■■■■■
0x807F: ■□□□□□□□□■■■■■■■
0x807F: ■□□□□□□□□■■■■■■■
0xC03F: ■■□□□□□□□□■■■■■■
0xC03F: ■■□□□□□□□□■■■■■■
0xE01F: ■■■□□□□□□□□■■■■■
0xE01F: ■■■□□□□□□□□■■■■■
0xF00F: ■■■■□□□□□□□□■■■■
0xF00F: ■■■■□□□□□□□□■■■■
0xF807: ■■■■■□□□□□□□□■■■
0xF807: ■■■■■□□□□□□□□■■■
0xFC03: ■■■■■■□□□□□□□□■■
0xFC03: ■■■■■■□□□□□□□□■■
0xFE01: ■■■■■■■□□□□□□□□■
0xFE01: ■■■■■■■□□□□□□□□■
0xFF00: ■■■■■■■■□□□□□□□□
0xFF00: ■■■■■■■■□□□□□□□□
```

## Understanding the Patterns

These bit patterns create the 3D shadow effect for walls:
- The white pieces are drawn using AND operations (0 bits punch holes)
- The patterns create triangular or trapezoidal shadows
- Junction patches fill gaps where walls meet
- The hash figure creates a decorative crosshatch at intersections

The patterns correspond to different wall angles:
- S (South): Vertical walls
- SE/SSE: Diagonal walls sloping down-right
- E: Horizontal walls
- NE/NNE: Diagonal walls sloping up-right
- ENE/ESE: Nearly horizontal walls with slight slopes