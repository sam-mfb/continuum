import React, { useRef, useEffect } from 'react';
import { useAppSelector } from '../../store/store';

export const PlanetViewer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { planets, selectedPlanetIndex } = useAppSelector(state => state.galaxy);

  const selectedPlanet = selectedPlanetIndex !== null ? planets[selectedPlanetIndex] : null;

  useEffect(() => {
    if (!canvasRef.current || !selectedPlanet) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw planet dimensions text
    ctx.fillStyle = '#00FF00';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const text = `Planet Size: ${selectedPlanet.worldwidth} x ${selectedPlanet.worldheight}`;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // Draw additional info
    ctx.font = '16px monospace';
    ctx.fillText(`Gravity: ${selectedPlanet.gravx}, ${selectedPlanet.gravy}`, canvas.width / 2, canvas.height / 2 + 40);
    ctx.fillText(`Lines: ${selectedPlanet.lines.filter(l => l.startx !== -1).length}`, canvas.width / 2, canvas.height / 2 + 60);
    ctx.fillText(`Bunkers: ${selectedPlanet.bunkers.filter(b => b.x !== -1).length}`, canvas.width / 2, canvas.height / 2 + 80);

  }, [selectedPlanet]);

  if (!selectedPlanet) {
    return (
      <div className="planet-viewer empty">
        <p>Select a planet to view</p>
      </div>
    );
  }

  return (
    <div className="planet-viewer">
      <h3>Planet {selectedPlanetIndex! + 1}</h3>
      <canvas 
        ref={canvasRef}
        width={512}
        height={318}
        className="planet-canvas"
      />
    </div>
  );
};