import React, { useRef, useEffect } from 'react'
import { useAppSelector } from '../../store/store'

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
    
    // Get the appropriate sprite data
    try {
      switch (selectedType) {
        case 'ship': {
          const sprite = allSprites.ships.getRotationIndex(rotation)
          spriteData = showMask ? sprite.mask : sprite.def
          width = 30
          height = 30
          break
        }
        
        case 'bunker': {
          const sprite = allSprites.bunkers.getSprite(bunkerKind, rotation, bunkerVariation)
          spriteData = showMask ? sprite.mask : sprite.def
          width = 48
          height = 48
          break
        }
        
        case 'fuel': {
          const sprite = fuelFrame === 3 
            ? allSprites.fuels.emptyCell 
            : allSprites.fuels.getFrame(fuelFrame)
          spriteData = showMask ? sprite.mask : sprite.def
          width = 32
          height = 32
          break
        }
        
        case 'shard': {
          const sprite = allSprites.shards.getSprite(shardKind, rotation)
          spriteData = showMask ? sprite.mask : sprite.def
          width = 16
          height = 16
          break
        }
        
        case 'crater': {
          spriteData = showMask ? allSprites.crater.mask : allSprites.crater.def
          width = 30
          height = 30
          break
        }
        
        case 'shield': {
          spriteData = allSprites.shield.def
          width = 30
          height = 30
          break
        }
      }
    } catch (err) {
      console.error('Error getting sprite:', err)
      return
    }
    
    if (!spriteData) return
    
    // Convert 1-bit data to ImageData
    const pixels = new Uint8ClampedArray(width * height * 4)
    const bytesPerRow = Math.ceil(width / 8)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const byteIdx = y * bytesPerRow + Math.floor(x / 8)
        const bitIdx = 7 - (x % 8)
        const bit = (spriteData[byteIdx]! >> bitIdx) & 1
        
        const pixelIdx = (y * width + x) * 4
        const color = bit ? 0 : 255  // Black on white
        pixels[pixelIdx] = color
        pixels[pixelIdx + 1] = color
        pixels[pixelIdx + 2] = color
        pixels[pixelIdx + 3] = 255
      }
    }
    
    const imageData = new ImageData(pixels, width, height)
    
    // Set canvas size
    canvas.width = width * scale
    canvas.height = height * scale
    
    // Create a temporary canvas for the unscaled image
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = width
    tempCanvas.height = height
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return
    
    // Put image data on temp canvas
    tempCtx.putImageData(imageData, 0, 0)
    
    // Draw scaled to main canvas
    ctx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, canvas.width, canvas.height)
    
  }, [allSprites, selectedType, showMask, rotation, scale, bunkerKind, bunkerVariation, fuelFrame, shardKind])

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
      <div className="sprite-display" style={{ 
        display: 'inline-block',
        padding: '20px',
        background: showMask ? '#000' : '#fff',
        border: '1px solid #ccc'
      }}>
        <canvas 
          ref={canvasRef}
          style={{ 
            imageRendering: 'pixelated',
            display: 'block'
          }}
        />
      </div>
    </div>
  )
}