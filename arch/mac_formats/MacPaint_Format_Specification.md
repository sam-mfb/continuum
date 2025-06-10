# MacPaint File Format Specification

## Overview

MacPaint was the pioneering bitmap graphics application created by Bill Atkinson for the original Macintosh in 1984. This document describes the file format used by MacPaint and compatible applications like FullPaint.

The MacPaint format is elegantly simple, storing a monochrome (1-bit) bitmap image with dimensions of 576×720 pixels, which corresponds to the printable area of an 8×10 inch page at 72 DPI.

## File Structure

```
+------------------------+
| Header (512 bytes)     |
+------------------------+
| Bitmap Data            |
| (Variable size,        |
| PackBits compressed)   |
+------------------------+
```

## Detailed Specifications

### 1. File Header (512 bytes)

The header is exactly 512 bytes and contains pattern data that can be used by the application.

| Offset | Size | Type        | Description |
|--------|------|-------------|-------------|
| 0x000  | 512  | UInt8[512]  | Pattern array (256 patterns × 2 bytes each) |

**Pattern Data:**
- 256 patterns, each represented by 2 bytes (16 bits)
- Each pattern is an 8×8 pixel tile (8 bits × 8 rows = 64 bits total)
- Only first 2 rows (16 bits) are stored; patterns are typically repeated
- In most files, this area is filled with zeros
- Some applications may store custom patterns here

### 2. Bitmap Data

The bitmap data starts at offset 512 and contains the actual image data.

#### Image Specifications
- **Dimensions**: 576 pixels wide × 720 pixels high
- **Color Depth**: 1 bit per pixel (monochrome)
- **Pixel Values**: 0 = white, 1 = black
- **Storage**: Row-major order (top to bottom)
- **Row Width**: 72 bytes (576 pixels ÷ 8 bits/byte)

#### Compression: PackBits Algorithm

MacPaint uses the PackBits run-length encoding algorithm to compress the bitmap data. Each row is compressed independently.

**PackBits Encoding Rules:**

For each row of 72 bytes:
1. Read a flag byte (n)
2. Interpret based on value:
   - If n = 0 to 127: Copy the next (n + 1) bytes literally
   - If n = -1 to -127 (stored as 255 to 129): Repeat the next byte (-n + 1) times
   - If n = -128 (stored as 128): No operation (skip) - rarely used

**Decoding Algorithm:**

```python
def unpack_bits(data):
    """Decode PackBits compressed data"""
    result = []
    i = 0
    
    while i < len(data):
        flag = data[i]
        i += 1
        
        if flag >= 128:  # Repeat run
            if flag == 128:  # No-op (rare)
                # Note: Some encoders use 0x80 as literal run
                # Check if data follows to handle both cases
                if i < len(data) and len(result) < 72:
                    # Treat as literal run of 1 byte
                    result.append(data[i])
                    i += 1
                continue
            count = 257 - flag  # Convert to repeat count
            if i < len(data):
                result.extend([data[i]] * count)
                i += 1
        else:  # Literal run
            count = flag + 1
            result.extend(data[i:i + count])
            i += count
    
    return result
```

### 3. Complete File Reading Process

```python
def read_macpaint(filename):
    """Read a MacPaint file and return bitmap data"""
    with open(filename, 'rb') as f:
        # Read header (patterns)
        patterns = f.read(512)
        
        # Read compressed bitmap data
        bitmap = []
        for row in range(720):
            row_data = []
            while len(row_data) < 72:
                flag = ord(f.read(1))
                
                if flag >= 0x81:  # Repeat run (129-255)
                    count = 0x101 - flag
                    byte = ord(f.read(1))
                    row_data.extend([byte] * count)
                else:  # Literal run (0-127)
                    count = flag + 1
                    row_data.extend([ord(f.read(1)) for _ in range(count)])
            
            # Ensure we have exactly 72 bytes
            bitmap.append(row_data[:72])
    
    return patterns, bitmap
```

### 4. File Type Identification

MacPaint files can be identified by:

1. **Finder Type/Creator** (Classic Mac OS):
   - Type: `PNTG`
   - Creator: `MPNT` (MacPaint) or `PANT` (FullPaint)

2. **File Size**: After decompression, always 512 + (720 × 72) = 52,352 bytes

3. **Magic Bytes**: No specific magic number, but the file must:
   - Be at least 512 + 720 × 2 bytes (minimum compressed size)
   - Have valid PackBits data starting at offset 512
   - Decompress to exactly 720 rows of 72 bytes each

## Known Format Variations and Edge Cases

Based on analysis of real-world files, the following variations may be encountered:

### 1. Pattern Header Usage
While the 512-byte header is designed to store 256 patterns:
- **Standard**: Most files contain all zeros (0x00) in the header
- **With Patterns**: Some files store actual pattern data as 256 × 2-byte values
- **Partial Patterns**: Files may have patterns in only some slots with zeros elsewhere
- **Recommendation**: Readers should preserve but not require specific pattern data

### 2. PackBits Compression Variations

#### Standard PackBits
- **0x00-0x7F**: Literal run of (n + 1) bytes
- **0x81-0xFF**: Repeat next byte (257 - n) times
- **0x80**: No operation (skip)

#### Non-Standard Implementations
Some encoders may produce variations:
- **0x80 as Literal**: Some implementations treat 0x80 as a literal run of 1 byte instead of no-op
- **Recommendation**: Handle 0x80 conservatively - if followed by data, treat as literal run

#### Compression Efficiency Issues
- **Worst Case**: Files with no compression (all literal runs) will be 512 + (720 × 144) = 104,192 bytes
- **Poor Compression**: Some encoders produce suboptimal compression with unnecessary literal runs
- **Invalid Files**: Reject files where bitmap data equals exactly 720 × 144 bytes (indicates failed compression)

### 3. File Size Variations

#### Trailing Data
Some files may include additional data after the bitmap:
- **Metadata**: Up to 512 bytes of application-specific data
- **Padding**: Alignment to disk sector boundaries (e.g., 512-byte sectors)
- **Resource Fork Markers**: Classic Mac OS file system artifacts
- **Recommendation**: Accept files with up to 512 bytes trailing data, warn if more

#### Truncated Files
- **Minimum Valid Size**: 512 + (720 × 2) = 1,952 bytes (header + minimal compressed data)
- **Detection**: Files smaller than this should be rejected as corrupt

### 4. Application-Specific Variations

#### FullPaint
- **Creator Code**: `PANT` instead of `MPNT`
- **Format**: Identical to MacPaint
- **Patterns**: More likely to use pattern header for custom brushes

#### Third-Party Applications
- **SuperPaint**: May include additional metadata after bitmap
- **Thunderscan**: Scanner software may produce non-optimal compression
- **PC Conversions**: May lack proper Finder Type/Creator codes

### 5. Validation Strategies

#### Strict Validation
For maximum compatibility assurance:
1. Verify 512-byte header exists
2. Decompress entire bitmap to ensure exactly 720 × 72 bytes
3. Reject files with worst-case compression (720 × 144 bytes)
4. Reject files with >512 bytes trailing data
5. Verify no PackBits decoding errors

#### Lenient Validation
For maximum file acceptance:
1. Accept any 512+ byte file
2. Attempt to decode bitmap data
3. Accept 0x80 flag as either no-op or literal
4. Ignore trailing data
5. Accept partial bitmap if decoding fails mid-file

### 6. Error Recovery

When encountering malformed data:
- **Truncated Rows**: Pad with white (0x00) to complete 72 bytes
- **Excess Row Data**: Truncate to 72 bytes
- **Invalid PackBits**: Treat as literal data and continue
- **Missing Rows**: Fill remaining image with white

## Implementation Notes

### 1. Coordinate System
- Origin (0,0) is at the top-left corner
- X coordinates increase to the right (0-575)
- Y coordinates increase downward (0-719)

### 2. Bit Order
Within each byte, pixels are stored with the most significant bit (MSB) first:
- Bit 7 (MSB) = leftmost pixel
- Bit 0 (LSB) = rightmost pixel

Example: Byte value 0xC0 (11000000 binary) represents:
```
Pixels: ■■□□□□□□ (black, black, white, white, white, white, white, white)
```

### 3. Memory Layout
For a complete uncompressed bitmap:
```
Row 0:   [Byte 0] [Byte 1] ... [Byte 71]
Row 1:   [Byte 72] [Byte 73] ... [Byte 143]
...
Row 719: [Byte 51768] [Byte 51769] ... [Byte 51839]
```

### 4. Maximum File Size
- Worst case (no compression): 512 + (720 × 144) = 104,192 bytes
- This occurs when PackBits cannot find any runs to compress
- Typical files are much smaller due to large areas of white space

## Example: Creating a MacPaint File

```python
def create_macpaint(bitmap_data, filename):
    """Create a MacPaint file from a 576x720 bitmap"""
    with open(filename, 'wb') as f:
        # Write empty pattern header
        f.write(bytes(512))
        
        # Compress and write each row
        for row in bitmap_data:
            compressed = pack_bits(row)
            f.write(compressed)

def pack_bits(data):
    """Compress data using PackBits algorithm"""
    result = []
    i = 0
    
    while i < len(data):
        # Look for runs of identical bytes
        run_start = i
        run_byte = data[i]
        
        while i < len(data) and data[i] == run_byte and i - run_start < 128:
            i += 1
        
        run_length = i - run_start
        
        if run_length > 2:  # Repeat run is beneficial
            result.append(257 - run_length)
            result.append(run_byte)
        else:  # Look for literal run
            i = run_start
            lit_start = i
            
            while i < len(data) and i - lit_start < 128:
                # Stop if we find a run of 3+ identical bytes
                if i + 2 < len(data) and data[i] == data[i+1] == data[i+2]:
                    break
                i += 1
            
            lit_length = i - lit_start
            result.append(lit_length - 1)
            result.extend(data[lit_start:i])
    
    return bytes(result)
```

## Historical Notes

1. **Original Macintosh Screen**: 512×342 pixels, so MacPaint images were larger than the screen
2. **Print Area**: 576×720 pixels = 8×10 inches at 72 DPI (standard ImageWriter resolution)
3. **Pattern Palette**: The 512-byte header allowed storage of custom patterns, though most applications didn't use this feature
4. **File Extension**: `.mac` or `.pnt` were commonly used on non-Mac systems

## Variations

- **FullPaint**: Uses the same format but different Creator code (`PANT`)
- **Thunderscan**: Scanner software that could save in MacPaint format
- **Modern Usage**: Many graphics applications can still read/write MacPaint format

