import React, { useRef, useEffect } from 'react'
import { useAppSelector } from '../../store/store'
import type { FuelSprite } from '@/figs/types'

export const SpritesViewer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    allSprites,
    selectedType,
    showMask,
    rotation,
    scale,
    bunkerKind,
    bunkerVariation,
    fuelFrame,
    shardKind,
    flameFrame,
    strafeFrame,
    digitChar,
    error
  } = useAppSelector(state => state.sprites)

  useEffect(() => {
    if (!canvasRef.current || !allSprites) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    let spriteData: Uint8Array | null = null
    let width = 0
    let height = 0
    let storageRowBytes = 0

    // Get the appropriate sprite data
    try {
      switch (selectedType) {
        case 'ship': {
          const sprite = allSprites.ships.getRotationIndex(rotation)
          spriteData = showMask ? sprite.mask : sprite.def
          width = 32
          height = 32
          storageRowBytes = 4 // 32 bits wide storage
          break
        }

        case 'bunker': {
          const sprite = allSprites.bunkers.getSprite(
            bunkerKind,
            rotation,
            bunkerVariation
          )
          spriteData = showMask ? sprite.mask : sprite.def
          width = 48
          height = 48
          storageRowBytes = 6 // 48 bits wide storage
          break
        }

        case 'fuel': {
          let sprite: FuelSprite
          if (fuelFrame < 6) {
            // Normal animation frames
            sprite = allSprites.fuels.getFrame(fuelFrame)
          } else if (fuelFrame < 8) {
            // Draining frames
            sprite = allSprites.fuels.getDrainingFrame(fuelFrame - 6)
          } else {
            // Empty cell
            sprite = allSprites.fuels.emptyCell
          }
          spriteData = showMask ? sprite.mask : sprite.def
          width = 32
          height = 32
          storageRowBytes = 4 // 32 bits wide storage
          break
        }

        case 'shard': {
          const sprite = allSprites.shards.getSprite(shardKind, rotation)
          spriteData = showMask ? sprite.mask : sprite.def
          width = 16
          height = 16
          storageRowBytes = 2 // 16 bits wide storage
          break
        }

        case 'crater': {
          spriteData = showMask ? allSprites.crater.mask : allSprites.crater.def
          width = 32
          height = 32
          storageRowBytes = 4 // 32 bits wide storage
          break
        }

        case 'shield': {
          spriteData = allSprites.shield.def
          width = 32
          height = 32
          storageRowBytes = 4 // 32 bits wide storage
          break
        }

        case 'flame': {
          if (!allSprites.flames) break
          const flame = allSprites.flames.getFrame(flameFrame)
          spriteData = flame.def
          width = 8
          height = 7
          storageRowBytes = 1 // 8 bits wide storage
          break
        }

        case 'strafe': {
          if (!allSprites.strafe) break
          spriteData = allSprites.strafe.getFrame(strafeFrame)
          width = 8
          height = 8
          storageRowBytes = 1 // 8 bits wide storage
          break
        }

        case 'digit': {
          if (!allSprites.digits) break
          const charData = allSprites.digits.getCharacter(digitChar)
          if (!charData) break
          spriteData = charData
          width = 8
          height = 9
          storageRowBytes = 1
          break
        }
      }
    } catch (err) {
      console.error('Error getting sprite:', err)
      return
    }

    if (!spriteData) return

    // Set canvas size
    canvas.width = width * scale
    canvas.height = height * scale

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw pixels directly as scaled rectangles
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const byteIdx = y * storageRowBytes + Math.floor(x / 8)
        const bitIdx = 7 - (x % 8)
        const bit = (spriteData[byteIdx]! >> bitIdx) & 1

        if (bit) {
          ctx.fillStyle = '#000'
        } else {
          ctx.fillStyle = '#fff'
        }

        ctx.fillRect(x * scale, y * scale, scale, scale)
      }
    }
  }, [
    allSprites,
    selectedType,
    showMask,
    rotation,
    scale,
    bunkerKind,
    bunkerVariation,
    fuelFrame,
    shardKind,
    flameFrame,
    strafeFrame,
    digitChar
  ])

  if (error) {
    return (
      <div className="sprites-viewer error">
        <p>Error loading sprites: {error}</p>
      </div>
    )
  }

  if (!allSprites) {
    return (
      <div className="sprites-viewer empty">
        <p>Loading sprites...</p>
      </div>
    )
  }

  return (
    <div className="sprites-viewer">
      <h3>Sprite Display</h3>
      <div
        className="sprite-display"
        style={{
          display: 'inline-block',
          padding: '20px',
          background: showMask ? '#000' : '#fff',
          border: '1px solid #ccc'
        }}
      >
        <canvas
          ref={canvasRef}
          className="pixelated-canvas"
          style={{
            display: 'block'
          }}
        />
      </div>
    </div>
  )
}
