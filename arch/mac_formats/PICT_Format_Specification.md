# Apple PICT File Format Specification

## Overview

PICT (short for "Picture") is a graphics file format developed by Apple Computer in 1984 for the original Macintosh. It was the native graphics metafile format for QuickDraw, supporting both vector graphics and bitmap data. PICT files can contain a mixture of vector and raster graphics, making them extremely versatile but also complex.

This specification covers both PICT version 1 (introduced with the original Mac) and PICT version 2 (introduced with Color QuickDraw).

## File Structure

### Overall Layout

```
+------------------------+
| File Header (512 bytes)| (Optional on some systems)
+------------------------+
| Picture Header         |
| (10-42 bytes)          |
+------------------------+
| Picture Data           |
| (Variable size)        |
+------------------------+
| End Marker (0xFF/0x00FF)|
+------------------------+
```

## Detailed Specifications

### 1. File Header (Optional, 512 bytes)

Some applications prepend a 512-byte header (often all zeros) before the actual PICT data. This header is not part of the PICT specification but was commonly added for compatibility.

### 2. Picture Header

#### PICT Version 1 Header (10 bytes)

| Offset | Size | Type   | Description |
|--------|------|--------|-------------|
| 0x00   | 2    | UInt16 | Picture size (unused, often 0) |
| 0x02   | 8    | Rect   | Picture frame (t,l,b,r as Int16) |
| 0x0A   | 2    | UInt16 | Version marker (0x1101) |

#### PICT Version 2 Header (40-42 bytes)

| Offset | Size | Type   | Description |
|--------|------|--------|-------------|
| 0x00   | 2    | UInt16 | Picture size (unused, often 0) |
| 0x02   | 8    | Rect   | Picture frame (t,l,b,r as Int16) |
| 0x0A   | 2    | UInt16 | Version marker (0x0011) |

**Version 2 Extended Header:**

| Offset | Size | Type   | Description |
|--------|------|--------|-------------|
| 0x0C   | 2    | UInt16 | Version opcode (0x02FF) |
| 0x0E   | 2    | UInt16 | Header opcode (0x0C00) |
| 0x10   | 2    | Int16  | Version number (-1 or -2) |
| 0x12   | 2    | Int16  | Subversion number |

**Version 2.1 (Fixed-point coordinates):**
| Offset | Size | Type   | Description |
|--------|------|--------|-------------|
| 0x14   | 16   | Fixed[4]| Picture frame as fixed-point |
| 0x24   | 4    | UInt32 | Reserved (0) |

**Version 2.2 (With resolution):**
| Offset | Size | Type   | Description |
|--------|------|--------|-------------|
| 0x14   | 4    | Fixed  | Horizontal resolution (dpi) |
| 0x18   | 4    | Fixed  | Vertical resolution (dpi) |
| 0x1C   | 8    | Rect   | Optimal bounds |
| 0x24   | 4    | UInt32 | Reserved (0) |

### 3. Picture Data (Opcodes)

PICT files consist of a sequence of drawing commands (opcodes) followed by their parameters.

#### Opcode Format
- **PICT 1**: 1-byte opcodes (0x00-0xFF)
- **PICT 2**: 2-byte opcodes (0x0000-0xFFFF), must be word-aligned

### 4. Complete Opcode Reference

#### State Setting Operations

| Opcode | PICT 1 | PICT 2 | Name | Data Format | Description |
|--------|--------|--------|------|-------------|-------------|
| 0x01 | ✓ | ✓ | Clip | Region | Set clipping region |
| 0x02 | ✓ | ✓ | BkPat | Pattern[8] | Background pattern |
| 0x03 | ✓ | ✓ | TxFont | UInt16 | Font ID |
| 0x04 | ✓ | ✓ | TxFace | UInt8 | Text style flags |
| 0x05 | ✓ | ✓ | TxMode | UInt16 | Text transfer mode |
| 0x06 | ✓ | ✓ | SpExtra | Fixed | Extra space for space char |
| 0x07 | ✓ | ✓ | PnSize | Point | Pen width and height |
| 0x08 | ✓ | ✓ | PnMode | UInt16 | Pen transfer mode |
| 0x09 | ✓ | ✓ | PnPat | Pattern[8] | Pen pattern |
| 0x0A | ✓ | ✓ | FillPat | Pattern[8] | Fill pattern |
| 0x0B | ✓ | ✓ | OvSize | Point | Oval width and height |
| 0x0C | ✓ | ✓ | Origin | Point | Origin offset |
| 0x0D | ✓ | ✓ | TxSize | UInt16 | Font size in points |
| 0x0E | ✓ | ✓ | FgColor | UInt32 | Foreground color (indexed) |
| 0x0F | ✓ | ✓ | BkColor | UInt32 | Background color (indexed) |

#### Extended State Operations (PICT 2 only)

| Opcode | Name | Data Format | Description |
|--------|------|-------------|-------------|
| 0x10 | TxRatio | Point[2] | Text scaling ratio |
| 0x11 | Version | UInt8 | Picture version |
| 0x12 | BkPixPat | PixPat | Color background pattern |
| 0x13 | PnPixPat | PixPat | Color pen pattern |
| 0x14 | FillPixPat | PixPat | Color fill pattern |
| 0x15 | PnLocHFrac | UInt16 | Fractional pen position |
| 0x16 | ChExtra | Fixed | Extra space for all chars |
| 0x1A | RGBFgCol | RGBColor | RGB foreground color |
| 0x1B | RGBBkCol | RGBColor | RGB background color |
| 0x1C | HiliteMode | - | Use hilite mode |
| 0x1D | HiliteColor | RGBColor | RGB hilite color |
| 0x1E | DefHilite | - | Use default hilite |
| 0x1F | OpColor | RGBColor | RGB operation color |

#### Line Drawing Operations

| Opcode | Name | Data Format | Description |
|--------|------|-------------|-------------|
| 0x20 | Line | Point[2] | Draw line from-to |
| 0x21 | LineFrom | Point | Draw line from pen location |
| 0x22 | ShortLine | Point + dh,dv (Int8) | Short line with deltas |
| 0x23 | ShortLineFrom | dh,dv (Int8) | Short line from pen location |

#### Text Operations

| Opcode | Name | Data Format | Description |
|--------|------|-------------|-------------|
| 0x28 | LongText | Point + count + text | Position text |
| 0x29 | DHText | UInt8 + count + text | Horizontal offset text |
| 0x2A | DVText | UInt8 + count + text | Vertical offset text |
| 0x2B | DHDVText | UInt8[2] + count + text | H+V offset text |
| 0x2C | FontName | UInt16 + UInt8 + name | Set font by name |
| 0x2D | LineJustify | Fixed[2] | Line layout info |
| 0x2E | GlyphState | UInt16 + varies | Glyph drawing state |

#### Shape Drawing Operations

For each shape type, the operation is determined by adding the method to the base opcode:
- +0: Frame (outline only)
- +1: Paint (fill with pen pattern)
- +2: Erase (fill with background pattern)
- +3: Invert (invert pixels)
- +4: Fill (fill with fill pattern)

**Rectangle Operations:**
| Base | Name | Data Format |
|------|------|-------------|
| 0x30 | Rect | Rect |
| 0x38 | SameRect | - (uses last rect) |

**Round Rectangle Operations:**
| Base | Name | Data Format |
|------|------|-------------|
| 0x40 | RRect | Rect |
| 0x48 | SameRRect | - (uses last rect) |

**Oval Operations:**
| Base | Name | Data Format |
|------|------|-------------|
| 0x50 | Oval | Rect |
| 0x58 | SameOval | - (uses last rect) |

**Arc Operations:**
| Base | Name | Data Format |
|------|------|-------------|
| 0x60 | Arc | Rect + angles |
| 0x68 | SameArc | angles only |

**Polygon Operations:**
| Base | Name | Data Format |
|------|------|-------------|
| 0x70 | Poly | Polygon data |
| 0x78 | SamePoly | - (uses last poly) |

**Region Operations:**
| Base | Name | Data Format |
|------|------|-------------|
| 0x80 | Region | Region data |
| 0x88 | SameRegion | - (uses last region) |

#### Bitmap/Pixmap Operations

| Opcode | Name | Data Format | Description |
|--------|------|-------------|-------------|
| 0x90 | BitsRect | BitMap + data | Bitmap transfer |
| 0x91 | BitsRgn | BitMap + region + data | Clipped bitmap |
| 0x98 | PackBitsRect | BitMap + packed data | Packed bitmap |
| 0x99 | PackBitsRgn | BitMap + region + packed | Clipped packed bitmap |
| 0x9A | DirectBitsRect | PixMap + data | Direct color pixmap |
| 0x9B | DirectBitsRgn | PixMap + region + data | Clipped color pixmap |

#### Comments and Special

| Opcode | Name | Data Format | Description |
|--------|------|-------------|-------------|
| 0xA0 | ShortComment | UInt16 | Application comment |
| 0xA1 | LongComment | UInt16 + UInt16 + data | Extended comment |
| 0xFF | OpEndPic | - | End of picture |

#### Extended Operations (PICT 2)

| Opcode | Name | Data Format | Description |
|--------|------|-------------|-------------|
| 0x8200 | CompressedQuickTime | UInt32 + data | QuickTime image |
| 0x8201 | UncompressedQuickTime | UInt32 + data | Uncompressed QT |

### 5. Data Structure Definitions

#### Basic Types

```c
typedef int16_t  Int16;
typedef uint16_t UInt16;
typedef int32_t  Fixed;     // 16.16 fixed-point number
typedef uint32_t UInt32;

struct Point {
    Int16 v;    // vertical (y)
    Int16 h;    // horizontal (x)
};

struct Rect {
    Int16 top;
    Int16 left;
    Int16 bottom;
    Int16 right;
};

struct RGBColor {
    UInt16 red;     // 0-65535
    UInt16 green;   // 0-65535
    UInt16 blue;    // 0-65535
};
```

#### Pattern Structure

```c
typedef UInt8 Pattern[8];   // 8x8 bit pattern
```

#### Region Structure

```c
struct Region {
    UInt16 size;        // Total size in bytes
    Rect   bounds;      // Bounding rectangle
    // Followed by region data
};
```

#### Bitmap Structure

```c
struct BitMap {
    UInt16 rowBytes;    // Bytes per row (high bit = flags)
    Rect   bounds;      // Bitmap bounds
    // Followed by bitmap data
};
```

#### Polygon Structure

```c
struct Polygon {
    UInt16 size;        // Total size in bytes
    Rect   bounds;      // Bounding rectangle
    Point  points[];    // Variable number of points
};
```

### 6. Transfer Modes

Common transfer modes used in pen and text operations:

| Mode | Value | Description |
|------|-------|-------------|
| srcCopy | 0 | Replace destination |
| srcOr | 1 | OR with destination |
| srcXor | 2 | XOR with destination |
| srcBic | 3 | BIT_CLEAR with destination |
| notSrcCopy | 4 | Inverted source |
| notSrcOr | 5 | Inverted OR |
| notSrcXor | 6 | Inverted XOR |
| notSrcBic | 7 | Inverted BIT_CLEAR |

### 7. PackBits Compression

Bitmap data can be compressed using PackBits run-length encoding:

```python
def unpack_bits(data):
    """Decode PackBits compressed data"""
    result = []
    i = 0
    while i < len(data):
        flag = data[i]
        i += 1
        if flag >= 128:  # Repeat run
            count = 257 - flag
            if i < len(data):
                result.extend([data[i]] * count)
                i += 1
        else:  # Literal run
            count = flag + 1
            result.extend(data[i:i + count])
            i += count
    return result
```

## Implementation Notes

### 1. Alignment
- PICT 1: No alignment requirements
- PICT 2: All opcodes must start on word (2-byte) boundaries

### 2. Coordinate System
- Origin (0,0) at top-left
- Coordinates can be negative
- PICT 2 supports fractional coordinates via Fixed type

### 3. Color Models
- PICT 1: Indexed colors (8 standard QuickDraw colors)
- PICT 2: Full RGB colors (48-bit, 16 bits per component)

### 4. Reading Algorithm

```python
def read_pict(file):
    # Read header
    size = read_uint16(file)
    frame = read_rect(file)
    
    # Check version
    version_marker = read_uint16(file)
    if version_marker == 0x1101:
        version = 1
        opcode_size = 1
    elif version_marker == 0x0011:
        version = 2
        opcode_size = 2
        # Read extended header
        read_v2_header(file)
    else:
        raise ValueError("Invalid PICT file")
    
    # Process opcodes
    while True:
        if version == 2:
            # Ensure word alignment
            if file.tell() % 2:
                file.read(1)
        
        opcode = read_opcode(file, opcode_size)
        
        if opcode == 0xFF or opcode == 0x00FF:
            break  # End of picture
            
        process_opcode(opcode, file)
```

### 5. Common Patterns

#### Reserved Opcodes
Many opcodes are reserved for future use and follow patterns:
- No data: 0x17-0x19, 0x1F, 0x3D-0x3F, etc.
- 8 bytes data: 0x35-0x37, 0x45-0x47, etc.
- 12 bytes data: 0x4D-0x4F, 0x5D-0x5F, etc.
- Variable with length: 0x24-0x27, 0x2F, 0x6D-0x6F, etc.

## Historical Notes

1. **QuickDraw**: PICT was the metafile format for QuickDraw, Apple's 2D graphics library
2. **Color Evolution**: PICT 1 was black & white, PICT 2 added color support
3. **PDF Transition**: PICT was largely replaced by PDF in Mac OS X
4. **Cross-Platform**: PICT files often caused problems on non-Mac systems due to complexity

## Variations and Compatibility

### 1. File Creator/Type
- Type: `PICT`
- Creator: Various (`ttxt` for TeachText, `MDRW` for MacDraw, etc.)

### 2. Common Issues
- **512-byte header**: Some files have it, some don't
- **Alignment**: PICT 2 files from some apps may have alignment issues
- **Opcodes**: Not all applications support all opcodes
- **Color spaces**: RGB interpretation can vary

### 3. Modern Support
- macOS: Limited support via Preview and legacy frameworks
- Windows: Requires third-party software
- Linux: Supported via ImageMagick and other tools
