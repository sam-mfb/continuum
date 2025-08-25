/**
 * Status Bar Demo Game
 *
 * Demonstrates the high-level status bar rendering functions:
 * - Uses newSbar() for complete status bar rendering
 * - Types characters as the user types (displayed as message)
 * - Shows auto-updating score, fuel, and bonus counters
 * - Arrow Up/Down to change level
 * - Enter key resets all values
 * - Shows how the sprite service provides the status bar template
 */

import type { BitmapRenderer } from '../../bitmap'
import { cloneBitmap } from '@/bitmap'
import { viewClear } from '@/screen/render'
import { newSbar } from '@/status/render'
import type { SpriteServiceV2 } from '@/sprites/service'

// State for the demo - persists across render calls
type StatusBarState = {
  typedText: string
  score: number
  fuel: number
  bonus: number
  level: number
  lastUpdateTime: number
  ships: number
  initialized: boolean
  lastKeys: Set<string>
}

const state: StatusBarState = {
  typedText: '',
  score: 0,
  fuel: 100,
  bonus: 1000,
  level: 1,
  lastUpdateTime: 0,
  ships: 3,
  initialized: false,
  lastKeys: new Set()
}


// Process keyboard input
function processInput(keysDown: Set<string>): void {
  // Check for newly pressed keys
  for (const key of keysDown) {
    if (!state.lastKeys.has(key)) {
      // This is a newly pressed key
      if (key === 'Enter') {
        // Clear typed text and reset counters
        state.typedText = ''
        state.score = 0
        state.fuel = 100
        state.bonus = 1000
        state.level = 1
      } else if (key === 'Backspace') {
        // Remove last character
        state.typedText = state.typedText.slice(0, -1)
      } else if (key.length === 1) {
        // Add character if it's printable
        if (state.typedText.length < 20) {
          // Limit text length
          state.typedText += key.toUpperCase()
        }
      } else if (key === 'ArrowUp') {
        // Increase level
        state.level = Math.min(99, state.level + 1)
      } else if (key === 'ArrowDown') {
        // Decrease level
        state.level = Math.max(1, state.level - 1)
      }
    }
  }

  // Update last keys for next frame
  state.lastKeys = new Set(keysDown)
}

/**
 * Factory function to create the status bar demo renderer
 */
export const createStatusBarDemo =
  (spriteService: SpriteServiceV2): BitmapRenderer =>
  (bitmap, frame, _env) => {
    // Initialize on first frame
    if (!state.initialized) {
      state.initialized = true
      state.lastUpdateTime = Date.now()
    }

    // Process keyboard input
    processInput(frame.keysDown)

    // Update counters every second
    const now = Date.now()
    if (now - state.lastUpdateTime >= 1000) {
      state.score += 100
      state.fuel = Math.max(0, state.fuel - 1)
      state.bonus = Math.max(0, state.bonus - 10)

      // Wrap score at 9999999
      if (state.score > 9999999) {
        state.score = 0
      }

      // Refuel at 0
      if (state.fuel === 0) {
        state.fuel = 100
      }
      
      // Reset bonus at 0
      if (state.bonus === 0) {
        state.bonus = 1000
      }

      state.lastUpdateTime = now
    }

    // Create screen with gray background
    let screen = viewClear({ screenX: 0, screenY: 0 })(cloneBitmap(bitmap))

    // Use newSbar to draw the complete status bar
    screen = newSbar({
      lives: state.ships,
      message: state.typedText || null,
      level: state.level,
      score: state.score,
      fuel: state.fuel,
      bonus: state.bonus,
      spriteService
    })(screen)
    
    // If there's typed text, we need to update the message area
    // The newSbar already handles this, but we could also use writeMessage
    // separately if we wanted incremental updates

    // Copy result back to bitmap
    bitmap.data.set(screen.data)
  }
