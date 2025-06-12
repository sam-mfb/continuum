# PICT PackBits Format Specification

## Overview

This document describes the PICT file format as used in `continuum_title_page.mac` and similar files from the Continuum game. These files use Apple's PICT format with PackBits compression to store black and white bitmap images.

## File Structure

### Overall Layout

```
[PICT Header] → [PackBitsRect Operation 1] → [PackBitsRect Operation 2] → ... → [End]
```

The file contains multiple PackBitsRect drawing operations, each containing a portion of the complete image. In the case of `continuum_title_page.mac`:

- File size: 8,815 bytes
- Contains 7 PackBitsRect operations
- Total image data: 311 rows (not the full 342 rows expected)

### PICT Header (0x000 - 0x22F)

The PICT header contains metadata and drawing setup information:

```
Offset  Size  Description
------  ----  -----------
0x000   512   PICT version and setup data
0x200   ~48   Additional PICT opcodes and setup
```

Notable patterns in the header:
- Offset 0x010: `0000 0000 0000 0137 01f8` - Possible dimensions (0x137 = 311, 0x1f8 = 504)
- Multiple fill patterns with `ffff ffff` (solid black)

### PackBitsRect Operations

Each PackBitsRect operation draws a horizontal strip of the image:

```
Offset    Opcode  Bounds (TLBR)          Description
--------  ------  --------------------    -----------
0x07da    0098    0031,0000,0062,01f8    Rows 49-98 (49 rows)
0x11d3    0098    0062,0000,0093,01f8    Rows 98-147 (49 rows)
0x188b    0098    0093,0000,00c4,01f8    Rows 147-196 (49 rows)
0x1bc6    0098    00c4,0000,00f5,01f8    Rows 196-245 (49 rows)
0x1ea2    0098    00f5,0000,0126,01f8    Rows 245-294 (49 rows)
0x218b    0098    0126,0000,0137,01f8    Rows 294-311 (17 rows)
```

Note: The first 49 rows (0-48) are stored differently, starting at offset 0x230 without a PackBitsRect opcode.

### PackBitsRect Structure

Each PackBitsRect operation has this structure:

```
[Opcode] [rowBytes] [Bounds] [Compressed Data]
   2B        2B        8B          Variable
```

- **Opcode**: `0x0098` (PackBitsRect)
- **rowBytes**: `0x0040` (64 bytes) - but only 63 are used
- **Bounds**: Rectangle as 4 16-bit big-endian integers (top, left, bottom, right)
- **Compressed Data**: Multiple rows of PackBits-compressed bitmap data

### Segment Transitions

Between PackBitsRect operations, there's typically a transition pattern:
- `0x01 0x08` - End of current operation marker
- Variable padding/data
- Next `0x00 0x98` opcode

## PackBits Compression

### Algorithm

PackBits is a simple run-length encoding scheme where each compressed scanline is prefixed with its length:

```
[Length Byte] [Compressed Data for Row]
     1B              Length bytes
```

The compressed data uses these encoding rules:

1. **Length byte** (n): Indicates compressed data size (1-127 bytes)
2. **Control byte** (c) in compressed data:
   - If `c < 128`: Literal run - copy next (c + 1) bytes
   - If `c > 128`: Repeat run - repeat next byte (257 - c) times  
   - If `c = 128`: No operation (rare)

### Example

```
Compressed: 27 FE FF 1E FD 55 7D ...
            ^^ Length = 39 bytes of compressed data
               ^^ Control = 254 (>128)
                  ^^ Value = FF
                     Result: Repeat 0xFF for (257-254)=3 bytes
                        ^^ Control = 30 (<128)
                           Result: Copy next 31 bytes literally
```

## Image Dimensions

### Stored Dimensions
- Width: 504 pixels (0x1F8)
- Height: 311 rows (0x137)
- Bytes per row: 63 (504 ÷ 8)

### Display Dimensions
- Width: 512 pixels (original Mac screen width)
- Height: 342 rows (original Mac screen height)
- Bytes per row: 64 (512 ÷ 8)

### Dimension Mismatch Handling

1. **Width**: Each 63-byte row is padded with 0x00 to make 64 bytes
2. **Height**: Missing 31 rows (342 - 311) are filled with 0xFF (black)

## Decoding Process

1. **Locate First Data**: Start at offset 0x230 for first 49 rows
2. **Decode Rows**: For each row:
   - Read length byte
   - Decode that many bytes using PackBits algorithm
   - Store 63 decoded bytes
   - Pad with 0x00 to make 64 bytes
3. **Handle Transitions**: When encountering `0x01 0x08`:
   - Skip ahead to next `0x00 0x98` opcode
   - Skip 12-byte header (opcode + rowBytes + bounds)
   - Continue decoding
4. **Fill Missing Rows**: Rows 0-30 and any gaps filled with 0xFF

## Data Offsets

Key offsets where compressed data actually begins:

```
Segment  Data Start  Rows Decoded
-------  ----------  ------------
1        0x0230      49 (special case - no header)
2        0x07ef      49 (0x7da + 0x15)
3        0x11e8      49 (0x11d3 + 0x15)
4        0x18a0      49 (0x188b + 0x15)
5        0x1bdb      49 (0x1bc6 + 0x15)
6        0x1eb7      49 (0x1ea2 + 0x15)
7        0x21a0      48 (0x218b + 0x15)
```

The 0x15 (21 byte) offset from PackBitsRect opcode to data includes:
- 2 bytes: opcode (0x00 0x98)
- 2 bytes: rowBytes
- 8 bytes: bounds rectangle
- ~9 bytes: Additional PICT data/alignment

## Notes and Observations

1. **Not Standard PICT**: This format appears to be a specialized variant optimized for game graphics
2. **Missing Rows**: The file only contains 311 of 342 expected rows
3. **Width Discrepancy**: PICT bounds show 504 pixels but output expects 512
4. **Compression Efficiency**: Achieves ~2.5:1 compression ratio on title screen
5. **Black vs White**: In classic Mac format, 0xFF = black pixels, 0x00 = white pixels

## Implementation Considerations

When implementing a decoder:
1. Handle both sequential decoding and segment-based approaches
2. Account for padding bytes between segments
3. Validate compressed length bytes (must be 1-127)
4. Fill missing data with appropriate defaults (0xFF for missing rows)
5. Convert from 504 to 512 pixel width by padding each row