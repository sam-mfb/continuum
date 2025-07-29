// Module to convert hardcoded sprites into sprite sets

import {
  flames,
  strafeDefs,
  digits,
  FLAME_WIDTH,
  FLAME_HEIGHT,
  FLAME_FRAMES,
  STRAFE_FRAMES,
  SPACECHAR
} from './hardcodedSprites'

export type FlameSprite = {
  def: Uint8Array
  width: number
  height: number
}

export type StrafeSpriteSet = {
  frames: Uint8Array[]
  getFrame(index: number): Uint8Array
}

export type DigitSpriteSet = {
  characters: Uint8Array[]
  getCharacter(char: string | number): Uint8Array | null
}

export type FlameSpriteSet = {
  frames: FlameSprite[]
  getFrame(index: number): FlameSprite
}

// Create flame sprite set
export function createFlameSpriteSet(): FlameSpriteSet {
  const frames: FlameSprite[] = flames.map(data => ({
    def: data,
    width: FLAME_WIDTH,
    height: FLAME_HEIGHT
  }))

  return {
    frames,
    getFrame(index: number): FlameSprite {
      const frame = frames[index % FLAME_FRAMES]
      if (!frame) throw new Error(`Flame sprite not found at index ${index}`)
      return frame
    }
  }
}

// Create strafe sprite set
export function createStrafeSpriteSet(): StrafeSpriteSet {
  return {
    frames: strafeDefs,
    getFrame(index: number): Uint8Array {
      const frame = strafeDefs[index % STRAFE_FRAMES]
      if (!frame) throw new Error(`Strafe sprite not found at index ${index}`)
      return frame
    }
  }
}

// Create digit/character sprite set
export function createDigitSpriteSet(): DigitSpriteSet {
  // Invert the characters (they're loaded inverted in the original)
  const invertedChars = digits.map(char => {
    const inverted = new Uint8Array(char.length)
    for (let i = 0; i < char.length; i++) {
      inverted[i] = char[i]! ^ 0xff
    }
    return inverted
  })

  return {
    characters: invertedChars,

    getCharacter(char: string | number): Uint8Array | null {
      let index: number

      if (typeof char === 'number') {
        // Direct index
        index = char
      } else if (char === ' ') {
        index = SPACECHAR
      } else if (char === 'SHIP') {
        index = SPACECHAR - 1
      } else if (char >= '0' && char <= '9') {
        index = char.charCodeAt(0) - '0'.charCodeAt(0)
      } else if (char >= 'A' && char <= 'Z') {
        index = char.charCodeAt(0) - 'A'.charCodeAt(0) + 10
      } else if (char >= 'a' && char <= 'z') {
        index = char.charCodeAt(0) - 'a'.charCodeAt(0) + 10
      } else {
        return null
      }

      if (index >= 0 && index < invertedChars.length) {
        return invertedChars[index]!
      }
      return null
    }
  }
}

