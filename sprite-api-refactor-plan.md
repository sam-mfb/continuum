# Sprite Service API Refactoring Plan

## Problem Statement

The current sprite service API has several issues:

1. **Multi-property objects**: Returns objects with `def`, `mask`, and `images.background1/2` properties, forcing consumers to decide which to use
2. **Format conversions**: Returns `Uint8Array` which games must manually convert to `MonochromeBitmap` or `Uint16Array`
3. **Alignment logic**: Consumers must handle the `(x + y) & 1` alignment logic to choose between background1/background2
4. **Inconsistent return types**: Some sprites return just `Uint8Array` (strafe, digit) while others return complex objects

## Proposed Solution

Create a simpler API that:

- Allows consumers to specify which variant they want (def, mask, background1, background2)
- Pre-computes all format conversions at load time for performance
- Returns all formats in a single object, letting consumers pick what they need
- Uses proper typing to prevent invalid variant requests

## New API Design

### Core Types

```typescript
// Sprite variants - explicit background selection
type ShipVariant = 'def' | 'mask'
type FullVariant = 'def' | 'mask' | 'background1' | 'background2'

// All formats pre-computed and returned
type SpriteData = {
  uint8: Uint8Array
  uint16: Uint16Array
  bitmap: MonochromeBitmap
}

// Options types per sprite type
type ShipOptions = { variant: ShipVariant }
type FullOptions = { variant: FullVariant }
```

### Service Methods

```typescript
type SpriteService = {
  // Ship only has def and mask
  getShipSprite(rotation: number, options: ShipOptions): SpriteData

  // Full variant support (def, mask, background1, background2)
  getBunkerSprite(
    kind: BunkerKind,
    rotation: number,
    options: FullOptions
  ): SpriteData
  getFuelSprite(frame: number, options: FullOptions): SpriteData
  getShardSprite(
    kind: number,
    rotation: number,
    options: FullOptions
  ): SpriteData
  getCraterSprite(options: FullOptions): SpriteData

  // No options - only def variant exists
  getShieldSprite(): SpriteData
  getFlameSprite(frame: number): SpriteData
  getStrafeSprite(rotation: number): SpriteData
  getDigitSprite(char: string): SpriteData
}
```

### Example Usage

```typescript
// Get ship mask - all formats available
const shipMask = spriteService.getShipSprite(15, { variant: 'mask' })
const maskBitmap = shipMask.bitmap // Use bitmap format
const maskUint16 = shipMask.uint16 // Or uint16 format

// Get bunker with explicit background selection
const align = (x + y) & 1
const bunker = spriteService.getBunkerSprite(WALL, 8, {
  variant: align === 0 ? 'background1' : 'background2'
})
const bunkerBitmap = bunker.bitmap

// Shield has no options - only def variant
const shield = spriteService.getShieldSprite()
const shieldData = shield.uint8

// TypeScript prevents invalid requests at compile time
// spriteService.getShipSprite(15, { variant: 'background1' })  // TS Error!
```

### Implementation Strategy

1. **Pre-compute all formats at load time** using helper functions:

   ```typescript
   // Module-level helper functions
   function precomputeFormats(
     data: Uint8Array,
     width: number,
     height: number
   ): SpriteData {
     return {
       uint8: data,
       uint16: toUint16Array(data),
       bitmap: toMonochromeBitmap(data, width, height)
     }
   }

   function toUint16Array(data: Uint8Array): Uint16Array {
     /* ... */
   }
   function toMonochromeBitmap(
     data: Uint8Array,
     width: number,
     height: number
   ): MonochromeBitmap {
     /* ... */
   }
   ```

2. **Store pre-computed data** in the service's internal storage during initialization

3. **Simple getter methods** that just return the pre-computed data for the requested variant

### Benefits

1. **Cleaner consumer code**: No manual conversions, all formats readily available
2. **Type safety**: Invalid variant requests caught at compile time
3. **Performance**: All formats pre-computed at load time, no runtime conversion
4. **Simplicity**: No complex generics or conditional return types
5. **Consistency**: Predictable API surface and return types
6. **Memory efficient**: Sprites are small, overhead is minimal (few hundred KB total)

### Migration Path

1. **Phase 1**: Implement new methods alongside existing ones
2. **Phase 2**: Update games to use new methods
3. **Phase 3**: Remove old methods after full migration

### Trade-offs

1. **Memory vs Performance**: Pre-computing all formats uses ~3x memory but eliminates runtime conversion
   - Acceptable given sprite sizes (32x32 = 128 bytes → 384 bytes with all formats)
2. **Explicit variants**: Must specify 'background1' or 'background2' rather than automatic selection
   - But this makes the code clearer about which variant is being used

## Summary

The new API simplifies sprite access by:

- Pre-computing all format conversions at load time
- Returning all formats in a single object
- Using explicit variant names (background1/background2 instead of alignment parameters)
- Properly typing each sprite type's supported variants
- Eliminating options for sprites with only one variant

This results in a cleaner, faster, and more type-safe API with minimal memory overhead.
