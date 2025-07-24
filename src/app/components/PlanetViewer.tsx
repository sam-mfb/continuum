import React, { useRef, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../../store/store'
import { toggleDisplayMode } from '../../store/galaxySlice'
import { drawLines } from '../drawLines'
import { drawBunkers } from '../drawBunkers'
import { drawFuels } from '../drawFuels'
import { drawCraters } from '../drawCraters'
import { drawShip } from '../drawShip'
import { PlanetGameViewer } from './PlanetGameViewer'

export const PlanetViewer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dispatch = useAppDispatch()
  const { planets, selectedPlanetIndex, displayMode } = useAppSelector(
    state => state.galaxy
  )

  const selectedPlanet =
    selectedPlanetIndex !== null ? planets[selectedPlanetIndex] : null

  useEffect(() => {
    if (!canvasRef.current || !selectedPlanet || displayMode !== 'map') return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    drawLines(ctx, selectedPlanet.lines)
    drawBunkers(ctx, selectedPlanet.bunkers)
    drawFuels(ctx, selectedPlanet.fuels)
    drawCraters(ctx, selectedPlanet.craters)
    drawShip(ctx, selectedPlanet.xstart, selectedPlanet.ystart, 0)
  }, [selectedPlanet, displayMode])

  if (!selectedPlanet) {
    return (
      <div className="planet-viewer empty">
        <p>Select a planet to view</p>
      </div>
    )
  }

  const handleToggleDisplayMode = () => {
    dispatch(toggleDisplayMode())
  }

  return (
    <div className="planet-viewer">
      <div className="planet-viewer-header">
        <h3>Planet {selectedPlanetIndex! + 1}</h3>
        <button onClick={handleToggleDisplayMode} className="toggle-button">
          {displayMode === 'map' ? 'Switch to Game View' : 'Switch to Map View'}
        </button>
      </div>
      {displayMode === 'map' ? (
        <canvas
          ref={canvasRef}
          width={selectedPlanet ? selectedPlanet.worldwidth : 512}
          height={selectedPlanet ? selectedPlanet.worldheight : 318}
          className="planet-canvas"
        />
      ) : (
        <PlanetGameViewer />
      )}
    </div>
  )
}
