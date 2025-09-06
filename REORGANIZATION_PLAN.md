# Source Code Reorganization Plan

## Overview
Restructure the src/ directory to create clear separation between:
- Core game implementation (direct ports from original)
- Helper libraries (modern utilities)
- Development tools app
- Production game app (to be built)

## Final Structure

```
src/
├── core/                   # Direct ports from original game
│   ├── ship/              # Including shipSlice.ts & collision detection
│   ├── planet/            # Including planetSlice.ts
│   ├── shots/             # Including shotsSlice.ts
│   ├── walls/             # Including wallsSlice.ts
│   ├── explosions/        # Including explosionsSlice.ts
│   ├── status/            # Including statusSlice.ts
│   ├── screen/            # Including screenSlice.ts
│   ├── galaxy/            # Core galaxy logic
│   ├── sound/             # Sound engine (including soundSlice.ts)
│   ├── sprites/           # Sprite service & management
│   ├── figs/              # Figure data
│   └── shared/            # Core utilities
│
├── lib/                    # Modern helper libraries
│   ├── asm/               # Assembly emulator
│   └── bitmap/            # Bitmap rendering system
│
├── dev/                    # Development tools app
│   ├── index.html         # Dev app HTML entry
│   ├── index.css          # Dev app styles
│   ├── main.tsx           # Dev app entry point
│   ├── App.tsx
│   ├── art/               # Art assets for dev tools
│   ├── file/              # File management utilities
│   ├── components/        # React components for dev tools
│   ├── demos/             # Test games and demos
│   ├── store/             # Dev-only Redux store
│   │   ├── store.ts       # Main dev store (current src/store/store.ts)
│   │   ├── gameStore.ts   # Game store builder (current app/games/store.ts)
│   │   ├── uiSlice.ts
│   │   ├── galaxySlice.ts
│   │   ├── graphicsSlice.ts
│   │   ├── spritesSlice.ts
│   │   └── gameViewSlice.ts
│   └── draw/              # Drawing utilities for dev tools
│
└── game/                   # Production game app (future)
    ├── index.html         # Game app HTML entry
    ├── index.css          # Game app styles
    ├── main.tsx           # Game app entry point
    ├── App.tsx
    └── components/        # Game UI components
```

## Reorganization Phases

### Phase 1: Create New Directory Structure
1. Create core/, lib/, dev/, and game/ directories
2. Create subdirectories within each
3. No file moves yet - just directory creation

### Phase 2: Move Core Game Modules
1. Move game logic directories to core/:
   - ship/ → core/ship/ (including physics functions)
   - collision/* → core/ship/ (merge collision functions into ship)
   - planet/ → core/planet/
   - shots/ → core/shots/
   - walls/ → core/walls/
   - explosions/ → core/explosions/
   - status/ → core/status/
   - screen/ → core/screen/
   - galaxy/ → core/galaxy/
   - sound/ → core/sound/
   - sprites/ → core/sprites/
   - figs/ → core/figs/
   - shared/ → core/shared/

### Phase 3: Move Helper Libraries
1. Move asm/ → lib/asm/
2. Move bitmap/ → lib/bitmap/

### Phase 4: Reorganize Dev App
1. Move app/ contents to dev/:
   - app/App.tsx → dev/App.tsx
   - app/App.css → dev/App.css (rename to index.css)
   - app/components/ → dev/components/
   - app/games/ → dev/demos/
   - app/draw*.ts → dev/draw/
   - app/getBunkerAngles.ts → dev/draw/

2. Move dev-specific assets:
   - art/ → dev/art/
   - file/ → dev/file/
   - assets/ → distribute contents then delete

3. Move dev-specific store files:
   - store/ → dev/store/
   - Move app/games/store.ts → dev/store/gameStore.ts
   - Move app/games/containmentMiddleware.ts → dev/store/

4. Create dev entry files:
   - Create dev/index.html (copy from root index.html)
   - Move main.tsx → dev/main.tsx
   - Move index.css → dev/index.css
   - Move components/SoundTestPanel.tsx → dev/components/

### Phase 5: Setup Game App Structure
1. Create minimal game app structure:
   - Create game/index.html
   - Create game/main.tsx (minimal entry)
   - Create game/App.tsx (placeholder)
   - Create game/index.css (empty for now)

### Phase 6: Update Build Configuration
1. Update vite.config.ts for multi-app setup
2. Update package.json scripts:
   - `npm run dev` → serves dev/index.html
   - `npm run game` → serves game/index.html
   - `npm run build:dev` → builds dev app
   - `npm run build:game` → builds game app

### Phase 7: Update Import Paths
1. Update all imports to reflect new structure
2. Use path aliases:
   - @core/* → src/core/*
   - @lib/* → src/lib/*
   - @dev/* → src/dev/*
3. Run typecheck and fix any issues

### Phase 8: Test & Verify
1. Verify dev app runs correctly
2. Run all tests and fix paths
3. Ensure lint and typecheck pass
4. Create simple test for game app entry

### Phase 9: Cleanup
1. Remove old empty directories
2. Update .gitignore if needed
3. Update CLAUDE.md with new structure
4. Commit changes

### Phase 10: Documentation
Create README files at each level to explain the organizational structure:

1. **src/README.md** - Overall organization explaining the four main directories
   - core/ - Direct ports from original game
   - lib/ - Modern helper libraries
   - dev/ - Development tools application
   - game/ - Production game application

2. **Second level READMEs:**
   - core/README.md - Explains game modules organization
   - lib/README.md - Describes helper libraries
   - dev/README.md - Development app structure
   - game/README.md - Game app structure

3. **Third level READMEs (core modules):**
   - core/ship/README.md - Ship control, physics, and collision detection
   - core/planet/README.md - Planet generation and management
   - core/shots/README.md - Projectile system
   - core/walls/README.md - Wall/boundary system
   - core/explosions/README.md - Explosion effects
   - core/status/README.md - Status bar and game state display
   - core/screen/README.md - Screen rendering coordination
   - core/galaxy/README.md - Galaxy generation and navigation
   - core/sound/README.md - Sound engine and effects
   - core/sprites/README.md - Sprite loading and management
   - core/figs/README.md - Figure/shape data
   - core/shared/README.md - Shared utilities

4. **Third level READMEs (lib):**
   - lib/asm/README.md - 68K assembly emulator for ported code
   - lib/bitmap/README.md - Monochrome bitmap rendering system

5. **Third level READMEs (dev):**
   - dev/components/README.md - React components for dev tools
   - dev/demos/README.md - Test games and visual demos
   - dev/store/README.md - Redux store for dev app
   - dev/draw/README.md - Drawing utilities for demos
   - dev/art/README.md - Art assets for dev tools
   - dev/file/README.md - File management utilities

## Implementation Notes

- Each phase should be committed separately for easy rollback
- Run `npm run dev` after each phase to verify nothing breaks
- Update imports incrementally to avoid large breaking changes
- Keep test files with their source files
- No shared CSS between apps - complete separation

## Success Criteria

- Dev app runs exactly as before with `npm run dev`
- Game app has minimal structure ready for development
- Clear separation between core game logic and dev tools
- All tests passing
- TypeScript compilation successful
- No shared dependencies between dev and game apps (except core and lib)