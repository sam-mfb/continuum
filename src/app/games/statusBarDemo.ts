/**
 * Status Bar Demo Game
 * 
 * Demonstrates the status bar rendering functions:
 * - Loads and displays the status bar template
 * - Types characters as the user types
 * - Shows incrementing score and fuel counters
 * - Clears on Enter key
 */

import type { BitmapRenderer } from '../../bitmap'
import { cloneBitmap, createMonochromeBitmap } from '@/bitmap'
import { viewClear } from '@/screen/render'
import { sbarClear, drawDigit } from '@/status/render'
import { SPACECHAR, ACHAR, SHIPCHAR } from '@/status/constants'
import { SBARSIZE } from '@/screen/constants'

// Import the digit sprites from hardcodedSprites
import { digits } from '@/figs/hardcodedSprites'

// State for the demo - persists across render calls
type StatusBarState = {
  statusBarTemplate: Uint8Array | null
  typedText: string
  score: number
  fuel: number
  lastUpdateTime: number
  ships: number
  loading: boolean
  error: string | null
  initialized: boolean
  lastKeys: Set<string>
}

const state: StatusBarState = {
  statusBarTemplate: null,
  typedText: '',
  score: 0,
  fuel: 100,
  lastUpdateTime: 0,
  ships: 3,
  loading: false,
  error: null,
  initialized: false,
  lastKeys: new Set()
}

// Load the status bar resource
async function loadStatusBar(): Promise<Uint8Array> {
  try {
    const response = await fetch('/src/assets/graphics/rsrc_259.bin')
    if (!response.ok) {
      throw new Error('Failed to load status bar resource')
    }
    
    const arrayBuffer = await response.arrayBuffer()
    
    // Import the correct decompression function
    const { expandTitlePage } = await import('@/art/utils')
    
    // Decompress using expandTitlePage with height = 24 (SBARHT)
    const decoded = expandTitlePage(arrayBuffer, 24)
    
    // Verify size matches expected status bar size
    if (decoded.length !== SBARSIZE) {
      console.warn(`Status bar size mismatch: expected ${SBARSIZE}, got ${decoded.length}`)
    }
    
    return decoded
  } catch (error) {
    console.error('Error loading status bar:', error)
    throw error
  }
}

// Convert character to digit index
function charToDigitIndex(char: string): number {
  const c = char.toUpperCase()
  if (c >= '0' && c <= '9') {
    return parseInt(c)
  } else if (c >= 'A' && c <= 'Z') {
    return c.charCodeAt(0) - 'A'.charCodeAt(0) + ACHAR
  } else if (c === ' ') {
    return SPACECHAR
  }
  return SPACECHAR // Default to space for unknown characters
}

// Draw a number at a position (right-aligned)
function drawNumber(
  screen: ReturnType<typeof createMonochromeBitmap>,
  statusBarTemplate: ReturnType<typeof createMonochromeBitmap>,
  x: number,
  y: number,
  num: number
): ReturnType<typeof createMonochromeBitmap> {
  let result = screen
  let n = num
  let currentX = x
  
  // Draw digits from right to left
  do {
    const digit = n % 10
    result = drawDigit({
      x: currentX,
      y,
      digitSprite: digits[digit]!,
      statusBarTemplate
    })(result)
    n = Math.floor(n / 10)
    currentX -= 8
  } while (n > 0 && currentX >= 0)
  
  return result
}

// Draw text at a position
function drawText(
  screen: ReturnType<typeof createMonochromeBitmap>,
  statusBarTemplate: ReturnType<typeof createMonochromeBitmap>,
  x: number,
  y: number,
  text: string
): ReturnType<typeof createMonochromeBitmap> {
  let result = screen
  let currentX = x
  
  for (const char of text) {
    const index = charToDigitIndex(char)
    if (index < digits.length) {
      result = drawDigit({
        x: currentX,
        y,
        digitSprite: digits[index]!,
        statusBarTemplate
      })(result)
    }
    currentX += 8
    if (currentX > 500) break // Don't overflow screen width
  }
  
  return result
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
      } else if (key === 'Backspace') {
        // Remove last character
        state.typedText = state.typedText.slice(0, -1)
      } else if (key.length === 1) {
        // Add character if it's printable
        if (state.typedText.length < 20) { // Limit text length
          state.typedText += key
        }
      }
    }
  }
  
  // Update last keys for next frame
  state.lastKeys = new Set(keysDown)
}

/**
 * The main bitmap renderer for the status bar demo
 */
export const statusBarDemo: BitmapRenderer = (bitmap, frame, _env) => {
  // Initialize on first frame
  if (!state.initialized) {
    state.initialized = true
    state.loading = true
    state.lastUpdateTime = Date.now()
    
    // Start async loading
    loadStatusBar().then(
      template => {
        console.log('Status bar loaded:', {
          size: template.length,
          expectedSize: SBARSIZE,
          first10Bytes: Array.from(template.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ')
        })
        state.statusBarTemplate = template
        state.loading = false
      },
      error => {
        console.error('Failed to load status bar:', error)
        state.error = error instanceof Error ? error.message : 'Failed to load'
        state.loading = false
      }
    )
  }
  
  // Process keyboard input
  processInput(frame.keysDown)
  
  // Update counters every second
  const now = Date.now()
  if (now - state.lastUpdateTime >= 1000 && state.statusBarTemplate) {
    state.score += 10
    state.fuel = Math.max(0, state.fuel - 1)
    
    // Wrap score at 99999
    if (state.score > 99999) {
      state.score = 0
    }
    
    // Refuel at 0
    if (state.fuel === 0) {
      state.fuel = 100
    }
    
    state.lastUpdateTime = now
  }
  
  // Create screen with gray background
  let screen = viewClear({ screenX: 0, screenY: 0 })(cloneBitmap(bitmap))
  
  if (state.loading) {
    // Just show gray background while loading
    bitmap.data.set(screen.data)
    return
  }
  
  if (state.error || !state.statusBarTemplate) {
    // Show error or loading state
    bitmap.data.set(screen.data)
    return
  }
  
  // Create status bar bitmap from the template
  const statusBarBitmap = createMonochromeBitmap(512, 342)
  // Copy the template data to the bitmap
  for (let i = 0; i < Math.min(state.statusBarTemplate.length, SBARSIZE); i++) {
    statusBarBitmap.data[i] = state.statusBarTemplate[i]!
  }
  
  // Use sbarClear to restore the status bar template
  screen = sbarClear({ statusBarTemplate: statusBarBitmap })(screen)
  
  // Draw ship lives (left side, top row)
  for (let i = 0; i < state.ships; i++) {
    screen = drawDigit({
      x: 8 + i * 16,  // Space them out a bit more
      y: 0,
      digitSprite: digits[SHIPCHAR]!,
      statusBarTemplate: statusBarBitmap
    })(screen)
  }
  
  // Draw typed text (center area, bottom row)
  if (state.typedText) {
    screen = drawText(screen, statusBarBitmap, 100, 12, state.typedText)
  }
  
  // Draw score label and number (right side, top row)
  screen = drawText(screen, statusBarBitmap, 400, 0, 'SCORE')
  screen = drawNumber(screen, statusBarBitmap, 480, 0, state.score)
  
  // Draw fuel label and number (right side, bottom row)
  screen = drawText(screen, statusBarBitmap, 410, 12, 'FUEL')
  screen = drawNumber(screen, statusBarBitmap, 480, 12, state.fuel)
  
  // Copy result back to bitmap
  bitmap.data.set(screen.data)
}