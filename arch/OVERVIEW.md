# Continuum Original Source Architecture

This document provides an overview of the architecture and code organization in `orig/Sources/`, the original 68000 Mac source code for Continuum.

## Core Architecture

Continuum follows a modular design with clear separation of concerns between different game systems. The codebase is optimized for 68000 Mac hardware with extensive use of assembly language for performance-critical sections.

### Key Constants & Constraints
- **Screen Resolution**: 512x342 pixels (Mac Plus era)
- **Game Objects**: 125 terrain lines, 25 bunkers, 15 fuel cells, 6 ship bullets, 20 bunker shots
- **Dual-Buffer Graphics**: Complete double-buffering system for smooth animation
- **Coordinate System**: Uses gravity-based physics simulation

## Module Overview

### Core System Files

#### `GW.h` - Central Definitions
The master header file containing all game constants, data structures, and type definitions:
- Screen dimensions and layout constants
- Game object limits and physics parameters  
- Data structures for ships, bullets, terrain, bunkers
- Sprite and bitmap definitions
- Enumerations for machine types and object kinds

#### `Main.c` - Program Flow Control
Top-level game management and initialization:
- Main game loop coordination
- Title screen and high score display
- Resource loading and Mac toolbox initialization
- Session management between editor and gameplay modes

#### `Well.c` - Environment Detection
Hardware detection and screen management:
- Mac model detection (Plus, SE30, Mac II, etc.)
- Graphics buffer allocation and management
- Screen type configuration for different hardware

### Gameplay Engine

#### `Play.c` - Core Game Logic
The heart of the gameplay system:
- Main game loop (`planet()`) for each level
- Physics simulation including gravity and projectile motion
- Player input handling and ship control
- Collision detection and response
- Frame synchronization and timing
- Dual-screen buffer coordination

#### `Draw.c` - Graphics Rendering
Optimized graphics engine with assembly language acceleration:
- Sprite rendering with transparency masks
- Terrain line drawing (multiple orientations)
- Collision detection through bitmap testing
- Screen clearing and double-buffer management
- Platform-specific graphics optimizations

### World Building System

#### `Edit.c` - Planet Editor Core
Level editing functionality:
- Main editor event loop
- Planet file save/load operations
- World property editing (gravity, size, etc.)
- Menu system for editor commands
- Integration with file system

#### `QuickEdit.c` - Interactive Editing Tools
Editor-specific graphics and interaction:
- Interactive drawing tools (lines, objects)
- Object selection and manipulation
- Editor viewport rendering
- Drag-and-drop functionality for game objects

### Supporting Modules

#### `Terrain.c`, `Walls.c`, `Bunkers.c` - World Elements
Specialized handlers for different world object types (referenced in headers but files handle specific object behaviors)

#### `Figs.c` - Sprite Management
Figure/sprite system for all visual game objects

#### `Sound.c` - Audio System  
Multi-channel sound effect management

#### `Utils.c` - Utility Functions
Common helper functions used throughout the codebase

#### `Junctions.c` - Connectivity System
Handles connections between world elements

## Key Architectural Patterns

### 1. **Data-Driven Design**
Extensive use of lookup tables, constants, and structured data types. All game behavior is parameterized through `GW.h` constants.

### 2. **Performance Optimization**
- Assembly language for graphics-intensive operations
- Careful memory management for limited Mac hardware
- Optimized collision detection using bitmap operations

### 3. **Modular Separation**
- Clear boundaries between input, physics, graphics, and file management
- Each module has well-defined responsibilities
- Minimal cross-module dependencies

### 4. **Resource-Based Assets**
Uses Mac resource system for graphics, sounds, and configuration data, allowing for easy asset management and localization.

### 5. **Dual-Mode Operation**
Seamless switching between gameplay mode (Play.c) and editor mode (Edit.c/QuickEdit.c) with shared underlying systems.

## Data Flow

1. **Initialization**: `Main.c` → `Well.c` (hardware detection) → resource loading
2. **Gameplay Loop**: `Main.c` → `Play.c` → `Draw.c` (with input from user)
3. **Editor Mode**: `Main.c` → `Edit.c` → `QuickEdit.c` → `Draw.c`
4. **File Operations**: Planet data flows through custom serialization in `Edit.c`

## Technical Foundation

This architecture represents sophisticated game engineering for its era, with careful attention to:
- Hardware constraints and optimization
- Smooth real-time performance
- Extensible world building tools
- Clean separation of concerns

The modular design makes it well-suited for recreation in modern web technologies while maintaining the original game's structure and behavior.