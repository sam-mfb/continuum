/**
 * @fileoverview Modern renderer status bar - displays game status information
 * Corresponds to status bar rendering in src/render/status/
 *
 * Renders the status bar using sprite composition:
 * - Background sprite (status-bar.png)
 * - Digit and letter sprites for score, fuel, bonus, level, message
 * - Ship icon sprites for lives
 */

import type { Frame, DrawableSprite } from '@/lib/frame/types'
import {
  LIVES_START_X,
  LIVES_Y,
  LIVES_SPACING,
  MESSAGE_X,
  MESSAGE_Y,
  FUEL_X,
  FUEL_Y,
  BONUS_X,
  BONUS_Y,
  LEVEL_X,
  LEVEL_Y,
  SCORE_Y,
  SCORE_X_NORMAL,
  SCORE_X_LARGE
} from '@/core/status'

type StatusBarDeps = {
  lives: number
  score: number
  fuel: number
  bonus: number
  level: number
  message: string | null
}

/**
 * Renders the status bar with all game information.
 * Uses sprite composition - background sprite plus digit/letter sprites on top.
 *
 * @param deps Dependencies object containing all status bar values
 * @returns Pure function that adds status bar drawables to frame
 */
export function drawStatusBar(deps: StatusBarDeps): (frame: Frame) => Frame {
  return frame => {
    const { lives, score, fuel, bonus, level, message } = deps

    const drawables: DrawableSprite[] = []

    // 1. Status bar background sprite
    drawables.push({
      id: 'status-bar-background',
      z: 1000,
      type: 'sprite',
      spriteId: 'status-bar',
      rotation: 0,
      topLeft: { x: 0, y: 0 },
      alpha: 1
    })

    // 2. Ship lives (spare lives only, not current ship)
    const spareLives = Math.max(0, lives - 1)
    for (
      let i = 0;
      i < spareLives && LIVES_START_X + i * LIVES_SPACING < 150;
      i++
    ) {
      drawables.push({
        id: `life-${i}`,
        z: 1001,
        type: 'sprite',
        spriteId: 'digit-SHIP',
        rotation: 0,
        topLeft: { x: LIVES_START_X + i * LIVES_SPACING, y: LIVES_Y },
        alpha: 1
      })
    }

    // 3. Message text
    if (message) {
      const messageSprites = createTextSprites(
        MESSAGE_X,
        MESSAGE_Y,
        message,
        'message'
      )
      drawables.push(...messageSprites)
    }

    // 4. Score (position varies based on magnitude)
    const scoreX = score < 1000000 ? SCORE_X_NORMAL : SCORE_X_LARGE
    const scoreSprites = createDigitSprites(
      scoreX,
      SCORE_Y,
      score,
      true,
      'score'
    )
    drawables.push(...scoreSprites)

    // 5. Fuel
    const fuelSprites = createDigitSprites(FUEL_X, FUEL_Y, fuel, true, 'fuel')
    drawables.push(...fuelSprites)

    // 6. Bonus
    const bonusSprites = createDigitSprites(
      BONUS_X,
      BONUS_Y,
      bonus,
      true,
      'bonus'
    )
    drawables.push(...bonusSprites)

    // 7. Level
    const levelSprites = createDigitSprites(
      LEVEL_X,
      LEVEL_Y,
      level,
      true,
      'level'
    )
    drawables.push(...levelSprites)

    return {
      ...frame,
      drawables: [...frame.drawables, ...drawables]
    }
  }
}

/**
 * Creates sprite drawables for a numeric value.
 *
 * @param x - X position (rightmost digit if rightAlign=true)
 * @param y - Y position
 * @param value - Numeric value to display
 * @param rightAlign - If true, position x is the rightmost digit
 * @param idPrefix - Prefix for drawable IDs
 * @returns Array of DrawableSprite objects
 */
function createDigitSprites(
  x: number,
  y: number,
  value: number,
  rightAlign: boolean,
  idPrefix: string
): DrawableSprite[] {
  const sprites: DrawableSprite[] = []
  let n = Math.abs(value)
  let currentX = x

  // Extract digits and create sprites
  const digits: number[] = []
  do {
    digits.push(n % 10)
    n = Math.floor(n / 10)
  } while (n > 0)

  if (rightAlign) {
    // Draw right-to-left (digits are already in reverse order)
    for (let i = 0; i < digits.length; i++) {
      const digit = digits[i]!
      sprites.push({
        id: `${idPrefix}-digit-${i}`,
        z: 1001,
        type: 'sprite',
        spriteId: `digit-${digit}`,
        rotation: 0,
        topLeft: { x: currentX, y },
        alpha: 1
      })
      currentX -= 8 // Move left for next digit
    }
  } else {
    // Draw left-to-right (reverse the digits array)
    digits.reverse()
    for (let i = 0; i < digits.length; i++) {
      const digit = digits[i]!
      sprites.push({
        id: `${idPrefix}-digit-${i}`,
        z: 1001,
        type: 'sprite',
        spriteId: `digit-${digit}`,
        rotation: 0,
        topLeft: { x: currentX, y },
        alpha: 1
      })
      currentX += 8 // Move right for next digit
    }
  }

  return sprites
}

/**
 * Creates sprite drawables for a text string.
 *
 * @param x - Starting X position
 * @param y - Y position
 * @param text - Text to display (will be converted to uppercase)
 * @param idPrefix - Prefix for drawable IDs
 * @returns Array of DrawableSprite objects
 */
function createTextSprites(
  x: number,
  y: number,
  text: string,
  idPrefix: string
): DrawableSprite[] {
  const sprites: DrawableSprite[] = []
  let currentX = x

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!
    const upperChar = char.toUpperCase()

    // Process A-Z and spaces
    if (upperChar >= 'A' && upperChar <= 'Z') {
      sprites.push({
        id: `${idPrefix}-char-${i}`,
        z: 1001,
        type: 'sprite',
        spriteId: `digit-${upperChar}`,
        rotation: 0,
        topLeft: { x: currentX, y },
        alpha: 1
      })
      currentX += 8
    } else if (char === ' ') {
      sprites.push({
        id: `${idPrefix}-char-${i}`,
        z: 1001,
        type: 'sprite',
        spriteId: 'digit-SPACE',
        rotation: 0,
        topLeft: { x: currentX, y },
        alpha: 1
      })
      currentX += 8
    }
    // Other characters are skipped (no x increment)
  }

  return sprites
}
