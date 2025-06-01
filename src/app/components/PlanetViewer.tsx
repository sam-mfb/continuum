import React, { useRef, useEffect } from 'react'
import { useAppSelector } from '../../store/store'
import { drawLines } from '../drawLines'
import { drawBunkers } from '../drawBunkers'
import { drawFuels } from '../drawFuels'
import { drawCraters } from '../drawCraters'
import { drawShip } from '../drawShip'

export const PlanetViewer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { planets, selectedPlanetIndex } = useAppSelector(state => state.galaxy)

  const selectedPlanet =
    selectedPlanetIndex !== null ? planets[selectedPlanetIndex] : null

  useEffect(() => {
    if (!canvasRef.current || !selectedPlanet) return

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
    drawShip(ctx, selectedPlanet.xstart, selectedPlanet.ystart)
  }, [selectedPlanet])

  if (!selectedPlanet) {
    return (
      <div className="planet-viewer empty">
        <p>Select a planet to view</p>
      </div>
    )
  }

  return (
    <div className="planet-viewer">
      <h3>Planet {selectedPlanetIndex! + 1}</h3>
      <canvas
        ref={canvasRef}
        width={selectedPlanet ? selectedPlanet.worldwidth : 512}
        height={selectedPlanet ? selectedPlanet.worldheight : 318}
        className="planet-canvas"
      />
    </div>
  )
}

