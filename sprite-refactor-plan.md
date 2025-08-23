# Sprite Service Refactoring Plan

## Overview

Refactor sprite data management from Redux store to a dedicated sprite service to address:

- Sprite data is static assets, not application state
- Non-serializable byte-handling classes shouldn't be in Redux
- Sprite loading shouldn't block Redux initialization

## Key Design Decisions

- **Builder Pattern**: Service created via factory function, not class
- **Dependency Injection**: Service passed via React Context, not direct imports
- **Stateless Service**: All sprite queries take parameters (rotation, frame, etc.)
- **Pre-Redux Loading**: Sprites load before Redux initializes

## Implementation Steps

### 1. Create Sprite Service Interface

**File**: `src/sprites/types.ts`

Define `SpriteService` interface with parameterized methods that return single sprites:

- `getShipSprite(rotationIndex: number): ShipSprite` - 32 rotations (0-31)
- `getBunkerSprite(kind: BunkerKind, rotationOrFrame: number): BunkerSprite` - Rotation for WALL/DIFF (0-15), animation frame for GROUND/FOLLOW/GENERATOR (0-7)
- `getFuelSprite(frame: number): FuelSprite` - 9 frames (0-7 animated, 8 is empty)
- `getShardSprite(kind: number, rotation: number): ShardSprite` - 7 kinds (0-6), 16 rotations each
- `getCraterSprite(): CraterSprite` - Single crater sprite
- `getShieldSprite(): ShieldSprite` - Single shield sprite
- `getFlameSprite(frame: number): FlameSprite` - Multiple flame animation frames
- `getStrafeSprite(rotation: number): Uint8Array` - 16 rotations (0-15) for strafe impact effects
- `getDigitSprite(char: string): Uint8Array | null` - Characters '0'-'9' and space

Move existing sprite types from Redux slice to this file.

### 2. Implement Sprite Service Builder

**File**: `src/sprites/service.ts`

Create factory function `createSpriteService()`:

- Loads sprite data from `/src/assets/graphics/rsrc_260.bin` for ships, bunkers, fuels, shards, crater, shield
- Creates hardcoded sprites from constants for flames, strafe, digits (using existing functions from `hardcodedSpriteSet.ts`)
- Caches `AllSprites` in closure
- Returns object implementing `SpriteService`
- Each method extracts/computes requested sprites based on parameters

### 3. Update App Initialization

**File**: `src/main.tsx` (or equivalent)

Modify startup sequence:

```typescript
// 1. Load sprites first (blocking)
const spriteService = await createSpriteService()

// 2. Initialize Redux store
const store = setupStore()

// 3. Render app with both available
root.render(
  <SpriteServiceProvider service={spriteService}>
    <Provider store={store}>
      <App />
    </Provider>
  </SpriteServiceProvider>
)
```

### 4. Create Dependency Injection Layer

**File**: `src/sprites/provider.tsx`

Implement:

- `SpriteServiceContext` - React Context for the service
- `SpriteServiceProvider` - Provider component
- `useSpriteService()` - Hook for components to access service

### 5. Update SpriteViewer Component

**File**: `src/components/tools/SpriteViewer.tsx` (or similar)

- Replace Redux sprite selectors with `useSpriteService()`
- Call service methods with current UI parameters
- Determine if local state or minimal Redux needed for UI controls

### 6. Update Game Components

Identify and update all components using sprite data:

- Replace Redux selectors with `useSpriteService()`
- Call appropriate service methods with needed parameters
- Remove sprite-related Redux dependencies

### 7. Clean Up Redux

**File**: `src/store/spritesSlice.ts`

Options:

- Remove entirely if SpriteViewer uses local state
- Reduce to minimal UI state if needed for SpriteViewer
- Remove all sprite data, loading state, and async thunks

### 8. Testing

Verify:

- Sprite viewer displays all sprite types correctly
- Game sprites render properly during gameplay
- No Redux serialization warnings
- App initialization handles loading errors gracefully

## File Structure

```
src/
├── sprites/
│   ├── types.ts       # ISpriteService interface & sprite types
│   ├── service.ts     # createSpriteService() builder
│   └── provider.tsx   # React Context & hooks
├── store/
│   └── spritesSlice.ts  # Remove or minimize
└── main.tsx            # Updated initialization
```

## Success Criteria

- ✅ Sprites load before Redux initialization
- ✅ No non-serializable data in Redux store
- ✅ Service accessed via dependency injection
- ✅ All sprite-dependent features working
- ✅ Clean separation of concerns

