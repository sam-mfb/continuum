import React, { useRef, useEffect } from 'react'
import { useAppSelector } from '../../store/store'
import type { SpriteServiceV2 } from '@/sprites/service'

type SpritesViewerProps = {
  spriteService: SpriteServiceV2
}

export const SpritesViewer: React.FC<SpritesViewerProps> = ({
  spriteService
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    selectedType,
    showMask,
    rotation,
    scale,
    bunkerKind,
    fuelFrame,
    shardKind,
    flameFrame,
    strafeFrame,
    digitChar
  } = useAppSelector(state => state.sprites)

  useEffect(() => {
    if (!canvasRef.current) return

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
          const variant = showMask ? 'mask' : 'def'
          const sprite = spriteService.getShipSprite(rotation, { variant })
          spriteData = sprite.uint8
          width = 32
          height = 32
          storageRowBytes = 4 // 32 bits wide storage
          break
        }

        case 'bunker': {
          const variant = showMask ? 'mask' : 'def'
          const sprite = spriteService.getBunkerSprite(bunkerKind, rotation, { variant })
          spriteData = sprite.uint8
          width = 48
          height = 48
          storageRowBytes = 6 // 48 bits wide storage
          break
        }

        case 'fuel': {
          const variant = showMask ? 'mask' : 'def'
          const sprite = spriteService.getFuelSprite(fuelFrame, { variant })
          spriteData = sprite.uint8
          width = 32
          height = 32
          storageRowBytes = 4 // 32 bits wide storage
          break
        }

        case 'shard': {
          const variant = showMask ? 'mask' : 'def'
          const sprite = spriteService.getShardSprite(shardKind, rotation, { variant })
          spriteData = sprite.uint8
          width = 16
          height = 16
          storageRowBytes = 2 // 16 bits wide storage
          break
        }

        case 'crater': {
          const variant = showMask ? 'mask' : 'def'
          const sprite = spriteService.getCraterSprite({ variant })
          spriteData = sprite.uint8
          width = 32
          height = 32
          storageRowBytes = 4 // 32 bits wide storage
          break
        }

        case 'shield': {
          const sprite = spriteService.getShieldSprite()
          spriteData = sprite.uint8
          width = 32
          height = 32
          storageRowBytes = 4 // 32 bits wide storage
          break
        }

        case 'flame': {
          const flame = spriteService.getFlameSprite(flameFrame)
          spriteData = flame.uint8
          width = 8
          height = 7
          storageRowBytes = 1 // 8 bits wide storage
          break
        }

        case 'strafe': {
          const strafe = spriteService.getStrafeSprite(strafeFrame)
          spriteData = strafe.uint8
          width = 8
          height = 8
          storageRowBytes = 1 // 8 bits wide storage
          break
        }

        case 'digit': {
          const charData = spriteService.getDigitSprite(digitChar)
          if (!charData) break
          spriteData = charData.uint8
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
    spriteService,
    selectedType,
    showMask,
    rotation,
    scale,
    bunkerKind,
    fuelFrame,
    shardKind,
    flameFrame,
    strafeFrame,
    digitChar
  ])

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
