# ASM Library

68K assembly emulator for porting original Mac machine code to JavaScript. Provides instruction set emulation, register management, and assembly macros for faithful code translation.

## Purpose and Functionality
Enables direct translation of 68K assembly code from the original game while maintaining exact behavior and timing characteristics.

## Main APIs/Exports
- `build68kArch()` - Creates a complete 68K emulator instance
- `createRegisters()` - Initializes 68K register set (D0-D7, A0-A7)
- `createInstructionSet()` - Provides 68K instruction implementations
- Assembly macros for common operations (MOVE, ADD, CMP, etc.)

## Usage Examples
```typescript
import { build68kArch } from '@/lib/asm'

// Create emulator instance
const asm = build68kArch()

// Execute 68K-style operations
asm.MOVE_L_IMM(0x12345678, 'D0')
asm.ADD_L('D0', 'D1')
```