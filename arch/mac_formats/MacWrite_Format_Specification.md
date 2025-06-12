# MacWrite File Format Specification

## Overview

This document describes the file format used by MacWrite versions 1.0 through 5.01. MacWrite files use a linear structure with optional text compression to reduce file size.

## Version History

- **Version 3**: MacWrite 1.0-2.2
- **Version 6**: MacWrite 4.5-5.01 (including Claris MacWrite)

## File Structure

### Overall Layout

```
+------------------------+
| Header (20-40 bytes)   |
+------------------------+
| Print Info (120 bytes) |
+------------------------+
| Window Info [0] (var)  | Main Document
+------------------------+
| Window Info [1] (var)  | Header (optional)
+------------------------+
| Window Info [2] (var)  | Footer (optional)
+------------------------+
| Free List (optional)   |
+------------------------+
| Document Data          |
+------------------------+
```

## Detailed Specifications

### 1. File Header

#### Version 3 Header (20 bytes)

| Offset | Size | Type   | Description                       |
| ------ | ---- | ------ | --------------------------------- |
| 0x00   | 2    | UInt16 | Version number (3)                |
| 0x02   | 2    | UInt16 | Data position offset              |
| 0x04   | 2    | Int16  | Number of paragraphs (main text)  |
| 0x06   | 2    | Int16  | Number of paragraphs (header)     |
| 0x08   | 2    | Int16  | Number of paragraphs (footer)     |
| 0x0A   | 6    | -      | Unknown/Reserved                  |
| 0x10   | 1    | Int8   | Has footer flag (non-zero = true) |
| 0x11   | 1    | Int8   | Has header flag (non-zero = true) |
| 0x12   | 2    | Int16  | Starting page number              |

#### Version 6 Header (40 bytes)

| Offset | Size | Type   | Description                                 |
| ------ | ---- | ------ | ------------------------------------------- |
| 0x00   | 2    | UInt16 | Version number (6)                          |
| 0x02   | 2    | Int16  | Number of paragraphs (main text)            |
| 0x04   | 2    | Int16  | Number of paragraphs (header)               |
| 0x06   | 2    | Int16  | Number of paragraphs (footer)               |
| 0x08   | 1    | UInt8  | Hide first page header/footer (0xFF = true) |
| 0x09   | 7    | -      | Unused + display flags + active doc         |
| 0x10   | 2    | Int16  | Starting page number                        |
| 0x12   | 4    | UInt32 | Free list position                          |
| 0x16   | 2    | UInt16 | Free list length                            |
| 0x18   | 2    | UInt16 | Free list allocated size                    |
| 0x1A   | 14   | -      | Unused                                      |

### 2. Print Info (120 bytes)

Located immediately after the header. Contains printer settings and page layout information.

| Offset | Size | Type  | Description            |
| ------ | ---- | ----- | ---------------------- |
| 0x00   | 2    | Int16 | iPrVersion             |
| 0x02   | 118  | -     | Printer info structure |

### 3. Window Info Structure

Each window (main, header, footer) has the following structure:

| Offset | Size | Type  | Description                             |
| ------ | ---- | ----- | --------------------------------------- |
| 0x00   | 2    | Int16 | infoSize (total size of this structure) |
| 0x02   | 72   | -     | Document header info                    |
| 0x4A   | var  | -     | Paragraph information entries           |
| var    | var  | -     | Line heights data                       |

#### Document Header Info (72 bytes)

| Offset | Size | Type  | Description                                |
| ------ | ---- | ----- | ------------------------------------------ |
| 0x00   | 8    | Rect  | Window position (top, left, bottom, right) |
| 0x08   | 4    | Point | Date field position (-1,-1 if not used)    |
| 0x0C   | 4    | Point | Time field position (-1,-1 if not used)    |
| 0x10   | 4    | Point | Page number position (-1,-1 if not used)   |
| 0x14   | 52   | -     | Other window settings                      |

### 4. Paragraph Information Entry

Each paragraph has a 16-byte information structure:

| Offset | Size | Type   | Description                            |
| ------ | ---- | ------ | -------------------------------------- |
| 0x00   | 2    | Int16  | Height (negative = graphic, 0 = ruler) |
| 0x02   | 2    | Int16  | Y position                             |
| 0x04   | 1    | UInt8  | Page number                            |
| 0x05   | 3    | -      | Unused                                 |
| 0x08   | 1    | UInt8  | Paragraph status flags                 |
| 0x09   | 1    | UInt8  | High byte of data position             |
| 0x0A   | 2    | UInt16 | Low word of data position              |
| 0x0C   | 2    | UInt16 | Data length                            |
| 0x0E   | 2    | UInt16 | Paragraph format flags                 |

#### Paragraph Status Flags (byte at offset 0x08)

| Bit | Description                                       |
| --- | ------------------------------------------------- |
| 0-1 | Justification (0=left, 1=center, 2=right, 3=full) |
| 2   | Reserved                                          |
| 3   | Text is compressed (1=compressed)                 |
| 4   | Reserved                                          |
| 5   | Justification is set                              |
| 6-7 | Reserved                                          |

#### Paragraph Format Flags (word at offset 0x0E)

| Bit   | Description                                                                      |
| ----- | -------------------------------------------------------------------------------- |
| 0     | Reserved (plain text when clear)                                                 |
| 1     | Bold                                                                             |
| 2     | Italic                                                                           |
| 3     | Underline                                                                        |
| 4     | Outline                                                                          |
| 5     | Shadow                                                                           |
| 6     | Superscript                                                                      |
| 7     | Subscript                                                                        |
| 8-10  | Font size (0=default, 1=9pt, 2=10pt, 3=12pt, 4=14pt, 5=18pt, 6=24pt, 7=reserved) |
| 11    | Reserved                                                                         |
| 12-15 | Font ID (high 4 bits)                                                            |

### 5. Line Heights Data

After the paragraph information entries, line height data is stored in a variable-length format:

```
[2 bytes: size] [height data...]
```

Height data format:

- Values 0-127: Actual line height
- Values 128-255: Repeat factor (value & 0x7F) for previous height

### 6. Text Data Structure

#### Text Entry Header

| Offset | Size | Type   | Description                            |
| ------ | ---- | ------ | -------------------------------------- |
| 0x00   | 2    | UInt16 | Number of characters                   |
| 0x02   | var  | -      | Text data (compressed or uncompressed) |
| var    | pad  | -      | Padding to even boundary               |
| var    | 2    | UInt16 | Format run size                        |
| var    | var  | -      | Format runs                            |

#### Uncompressed Text

Characters are stored as single bytes in their ASCII/Mac Roman encoding.

#### Compressed Text

Text compression uses a nibble-based scheme:

1. **Compression Table**: 15 most common characters (default: " etnroaisdlhcfp")
2. **Encoding**:
   - Read nibbles (4 bits) from bytes
   - If nibble = 0x0-0xE: Look up character from compression table
   - If nibble = 0xF: Next two nibbles form a full 8-bit character

Example:

```
Byte: 0x41 = 0100 0001
- First nibble: 0x4 → compression_table[4] = 'r'
- Second nibble: 0x1 → compression_table[1] = 'e'
Result: "re"
```

#### Format Runs (6 bytes each)

| Offset | Size | Type   | Description                                     |
| ------ | ---- | ------ | ----------------------------------------------- |
| 0x00   | 2    | UInt16 | Character position                              |
| 0x02   | 1    | UInt8  | Font size                                       |
| 0x03   | 1    | UInt8  | Style flags (same as paragraph format bits 0-7) |
| 0x04   | 2    | UInt16 | Font ID                                         |

### 7. Ruler Data Structure

| Offset | Size | Type   | Description                  |
| ------ | ---- | ------ | ---------------------------- |
| 0x00   | 2    | UInt16 | Data size                    |
| 0x02   | 2    | UInt16 | Left margin (in points)      |
| 0x04   | 2    | UInt16 | Right margin (in points)     |
| 0x06   | 2    | UInt16 | Paragraph justification      |
| 0x08   | 2    | UInt16 | Number of tabs               |
| 0x0A   | 1    | UInt8  | Line spacing                 |
| 0x0B   | 1    | UInt8  | Unused                       |
| 0x0C   | var  | -      | Tab positions (2 bytes each) |

### 8. Graphic Data Structure

Graphics are stored as standard Macintosh PICT format data.

| Offset | Size | Type   | Description |
| ------ | ---- | ------ | ----------- |
| 0x00   | 2    | UInt16 | Data size   |
| 0x02   | var  | -      | PICT data   |

### 9. Page Break Structure

Page breaks have minimal data:

| Offset | Size | Type   | Description           |
| ------ | ---- | ------ | --------------------- |
| 0x00   | 2    | UInt16 | Data size (usually 0) |

## Resource Fork

MacWrite files may contain a resource fork with the following resources:

- **STR 700**: Custom compression table (15 characters)
- **styl resources**: Additional style information

## Implementation Notes

1. **Byte Order**: All multi-byte values are stored in big-endian format (Motorola 68000)
2. **Text Encoding**: Mac Roman encoding is used for text
3. **Coordinates**: All measurements are in points (1/72 inch)
4. **Alignment**: Data structures are aligned to even byte boundaries

## Example Code for Text Decompression

```python
def decompress_text(data, num_chars, compression_table=" etnroaisdlhcfp"):
    result = []
    nibble_high = True
    current_byte = 0
    data_pos = 0

    for i in range(num_chars):
        for attempt in range(3):
            if nibble_high:
                if data_pos >= len(data):
                    raise ValueError("Unexpected end of data")
                current_byte = data[data_pos]
                data_pos += 1
                nibble = (current_byte >> 4) & 0x0F
            else:
                nibble = current_byte & 0x0F

            nibble_high = not nibble_high

            if attempt == 0:
                if nibble != 0x0F:
                    result.append(compression_table[nibble])
                    break
            elif attempt == 1:
                high_byte = nibble << 4
            else:  # attempt == 2
                result.append(chr(high_byte | nibble))

    return ''.join(result)
```

## Version-Specific Notes

### Version 3 (MacWrite 1.0-2.2)

- Simpler header structure
- Data position specified in header
- No free list support

### Version 6 (MacWrite 4.5-5.01)

- Extended header with free list support
- More sophisticated memory management
- Additional formatting options
