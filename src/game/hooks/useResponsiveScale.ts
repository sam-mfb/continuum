import { useState, useEffect } from 'react'
import {
  BASE_GAME_WIDTH,
  BASE_TOTAL_HEIGHT,
  getScaledDimensions
} from '../constants/dimensions'

// Padding around the game in pixels
const VIEWPORT_PADDING = 16

type ResponsiveScaleResult = {
  scale: number
  dimensions: {
    gameWidth: number
    gameHeight: number
    controlsHeight: number
    totalHeight: number
  }
}

/**
 * Calculate the optimal integer scale factor based on current viewport dimensions.
 * The scale will fit the game (512x513 at 1x) within the viewport while maintaining
 * pixel-perfect rendering.
 */
const calculateScale = (): number => {
  // Available space after accounting for padding
  const availableWidth = window.innerWidth - VIEWPORT_PADDING * 2
  const availableHeight = window.innerHeight - VIEWPORT_PADDING * 2

  // Calculate maximum scale that fits in each dimension
  const maxScaleByWidth = Math.floor(availableWidth / BASE_GAME_WIDTH)
  const maxScaleByHeight = Math.floor(availableHeight / BASE_TOTAL_HEIGHT)

  // Use the smaller scale to ensure it fits both dimensions
  // Minimum scale is 1 (never go below original size)
  const scale = Math.max(1, Math.min(maxScaleByWidth, maxScaleByHeight))

  return scale
}

/**
 * React hook that provides responsive scaling for the game canvas.
 * Automatically recalculates scale on window resize and orientation changes.
 *
 * @returns Object containing scale factor and scaled dimensions
 */
export const useResponsiveScale = (): ResponsiveScaleResult => {
  const [scale, setScale] = useState<number>(() => calculateScale())

  useEffect(() => {
    let timeoutId: number | undefined

    const handleResize = (): void => {
      // Debounce resize events to avoid excessive recalculations
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }

      timeoutId = window.setTimeout(() => {
        const newScale = calculateScale()
        setScale(newScale)
      }, 500) // 500ms debounce
    }

    // Listen to both resize and orientation change events
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    // Clean up event listeners on unmount
    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return {
    scale,
    dimensions: getScaledDimensions(scale)
  }
}
