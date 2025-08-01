import { useEffect, useRef, useState, type JSX } from 'react'
import { useAppSelector, useAppDispatch, store } from '@/store/store'
import { createMonochromeBitmap, clearBitmap, bitmapToCanvas } from '@/bitmap'
import { createPlanetRenderer } from '../games/planetRendererFactory'
import { wallsActions } from '@/walls/wallsSlice'
import { gameViewActions } from '@/store/gameViewSlice'
import { screenSlice } from '@/screen/screenSlice'
import type { PlanetState } from '@/planet/types'
import type { BitmapRenderer, MonochromeBitmap } from '@/bitmap'
import type { GameRendererStore } from '../games/types'

export const PlanetGameViewer = (): JSX.Element => {
  const dispatch = useAppDispatch()
  const selectedPlanetIndex = useAppSelector(
    state => state.galaxy.selectedPlanetIndex
  )
  const planets = useAppSelector(state => state.galaxy.planets)
  const [renderer, setRenderer] = useState<BitmapRenderer | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bitmapRef = useRef<MonochromeBitmap | null>(null)
  const animationFrameRef = useRef<number>(0)
  const keysDownRef = useRef<Set<string>>(new Set())
  const frameCountRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)

  const selectedPlanet: PlanetState | null =
    selectedPlanetIndex !== null ? planets[selectedPlanetIndex] || null : null

  // Reset frame count when planet changes
  useEffect(() => {
    frameCountRef.current = 0
    lastFrameTimeRef.current = Date.now()
  }, [selectedPlanetIndex])

  useEffect(() => {
    if (!selectedPlanet) {
      setRenderer(null)
      return
    }

    // Clear previous walls and viewport when planet changes
    dispatch(wallsActions.clearWalls())
    dispatch(gameViewActions.resetInitialized())
    dispatch(screenSlice.actions.setPosition({ x: 0, y: 0 }))

    // Create renderer for the selected planet
    const gameStore: GameRendererStore = {
      getState: () => ({
        walls: store.getState().walls,
        gameView: store.getState().gameView,
        screen: store.getState().screen
      }),
      dispatch: dispatch
    }

    const planetRenderer = createPlanetRenderer(selectedPlanet, gameStore)
    setRenderer(() => planetRenderer)
  }, [selectedPlanet, dispatch])

  // Set up game loop
  useEffect(() => {
    if (!canvasRef.current || !renderer || !selectedPlanet) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Initialize bitmap
    if (!bitmapRef.current) {
      bitmapRef.current = createMonochromeBitmap(512, 342)
    }

    // Set up keyboard event handlers
    const handleKeyDown = (e: KeyboardEvent): void => {
      keysDownRef.current.add(e.code)
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)
      ) {
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent): void => {
      keysDownRef.current.delete(e.code)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // Game loop
    const targetDelta = 1000 / 20 // 20 FPS
    let nextFrameTime = Date.now() + targetDelta

    const renderLoop = (): void => {
      const now = Date.now()

      if (now >= nextFrameTime) {
        const deltaTime = now - lastFrameTimeRef.current
        const totalTime = now - lastFrameTimeRef.current

        // Clear bitmap
        clearBitmap(bitmapRef.current!)

        // Create frame info
        const frameInfo = {
          frameCount: frameCountRef.current,
          deltaTime,
          totalTime,
          targetDelta,
          keysDown: new Set(keysDownRef.current),
          keysPressed: new Set<string>(),
          keysReleased: new Set<string>()
        }

        // Call renderer
        renderer(bitmapRef.current!, frameInfo, {
          width: 512,
          height: 342,
          fps: 20
        })

        // Convert bitmap to canvas
        bitmapToCanvas(bitmapRef.current!, ctx)

        // Update timing
        lastFrameTimeRef.current = now
        frameCountRef.current++
        nextFrameTime += targetDelta

        if (now > nextFrameTime) {
          nextFrameTime = now + targetDelta
        }
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop)
    }

    animationFrameRef.current = requestAnimationFrame(renderLoop)

    return (): void => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [renderer, selectedPlanet])

  if (!selectedPlanet || !renderer) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 text-gray-400">
        <p>Select a planet to view</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 p-4 rounded">
        <div className="mb-2 text-sm text-gray-400">
          Use arrow keys to navigate the planet
        </div>
        <canvas
          ref={canvasRef}
          width={512}
          height={342}
          style={{
            imageRendering: 'pixelated',
            background: '#000000'
          }}
          className="planet-canvas"
        />
      </div>
      <div className="text-sm text-gray-500">
        Planet {selectedPlanetIndex! + 1}: {selectedPlanet.worldwidth}x
        {selectedPlanet.worldheight}
      </div>
    </div>
  )
}
