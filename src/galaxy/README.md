# Galaxy File Format

Galaxy file parsing implementation based on original Continuum Mac source code.

## References

- Primary functions: `do_open()` and `read_header()` at Main.c:391-404
- File positioning: `get_planet()` function at Main.c:732-748
- Constants: GW.h (FILEHEAD=160, PLANSIZE=1540)
- Global variables: Main.c (int planets, int cartplanet, char indexes[150])

## File Structure

The Continuum galaxy file format consists of a 160-byte header followed by planet data:

### Header Format (160 bytes)

| Offset | Size | Description |
|--------|------|-------------|
| 0-1    | 2    | File identifier (-17, magic number for validation) |
| 2-3    | 2    | Number of planets in galaxy |
| 4-5    | 2    | Cartoon/demo planet number (for intro sequence) |
| 6-9    | 4    | Unused/padding |
| 10-159 | 150  | Index array (1 byte per planet, max 150 entries) |

### Planet Data

- Starts at byte 160
- Each planet occupies exactly 1540 bytes
- Planets are stored sequentially in the file

## Index Array Mechanism

The index array provides indirection between logical planet order and physical file layout:

- Each byte in the index array contains a planet index number (0-255)
- To find a planet's file location: `160 + (index_value × 1540)`
- This allows planets to be reordered without moving data blocks

### Example

Consider a galaxy file with 3 planets:

```
File layout: [Header 160b][Planet0 1540b][Planet1 1540b][Planet2 1540b]
Index array: [2, 0, 1]
```

**When user selects "Planet 1" (first in list):**
- Reads `index_array[0] = 2`
- Calculates file position: `160 + (2 × 1540) = 3240`
- Loads Planet2's data from file position 3240

**When user selects "Planet 2" (second in list):**
- Reads `index_array[1] = 0`
- Calculates file position: `160 + (0 × 1540) = 160`
- Loads Planet0's data from file position 160

**Result:** User sees planets in order: Planet2, Planet0, Planet1

This design allows the editor to reorder planets by simply modifying the index array values, without moving any planet data in the file.
