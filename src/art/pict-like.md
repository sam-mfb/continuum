Compression Algorithm Explanation

The file unknown.bin uses a PICT-format container with PackBits compression:

1. File Format: Apple PICT

- Standard Macintosh picture format
- Contains drawing operations (opcodes) that describe how to render the image
- The file uses PackBitsRect operations to draw compressed bitmap strips

2. Compression: PackBits Run-Length Encoding

- Each scanline (504 pixels = 63 bytes) is compressed independently
- Each compressed scanline is prefixed with its length (1 byte)
- The PackBits algorithm works as follows:
  - Literal run (n ≥ 0): Copy next n+1 bytes literally
  - Repeat run (n < 0): Repeat the next byte (257-n) times
  - No-op (n = -128/0x80): Skip (rarely used)

3. Structure:

[PICT Header] → [PackBitsRect opcode] → [Bounds] → [Compressed Data]
↓
[len][compressed row 1][len][compressed row 2]...

4. Compression Efficiency:

- Original size: 21,546 bytes (504×342 pixels ÷ 8)
- Compressed size: ~8,815 bytes
- Compression ratio: ~2.44:1
- Works well for images with runs of black or white pixels

5. Decoding Process:

1. Skip PICT header to find PackBitsRect data (offset 0x230)
1. For each row:


    - Read length byte
    - Read that many compressed bytes
    - Decode using PackBits rules
    - Output 63 uncompressed bytes

The compression is particularly effective for this title screen because it contains large areas of
solid black and white, which compress into short repeat runs.
