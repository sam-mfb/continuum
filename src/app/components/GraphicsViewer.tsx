import React, { useRef, useEffect } from 'react'
import { useAppSelector } from '../../store/store'

export const GraphicsViewer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { selectedFile, imageData, error } = useAppSelector(
    state => state.graphics
  )

  useEffect(() => {
    if (!canvasRef.current || !imageData) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw the image data
    ctx.putImageData(imageData, 0, 0)
  }, [imageData])

  if (error) {
    return (
      <div className="graphics-viewer error">
        <p>Error loading graphics: {error}</p>
      </div>
    )
  }

  if (!selectedFile) {
    return (
      <div className="graphics-viewer empty">
        <p>Select a graphics file to view</p>
      </div>
    )
  }

  if (!imageData) {
    return (
      <div className="graphics-viewer loading">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="graphics-viewer">
      <h3>{selectedFile.replace('.mac', '').replace(/_/g, ' ').toUpperCase()}</h3>
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={576}
          height={720}
          className="graphics-canvas"
        />
      </div>
    </div>
  )
}