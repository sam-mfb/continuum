import React from 'react'
import { useAppSelector, useAppDispatch } from '../../store/store'
import {
  toggleMask,
  setRotation,
  setScale,
  setBunkerKind,
  setBunkerVariation,
  setFuelFrame,
  setShardKind
} from '../../store/spritesSlice'
import type { BunkerKind } from '@/figs/types'

export const SpritesControls: React.FC = () => {
  const dispatch = useAppDispatch()
  const {
    selectedType,
    showMask,
    rotation,
    scale,
    bunkerKind,
    bunkerVariation,
    fuelFrame,
    shardKind,
    allSprites
  } = useAppSelector(state => state.sprites)

  if (!allSprites) {
    return null
  }

  // Get rotation limits based on sprite type
  const getRotationMax = (): number => {
    switch (selectedType) {
      case 'ship': return 31
      case 'bunker': return bunkerKind < 2 ? 15 : 0 // Only Wall and Diff rotate
      case 'shard': return 15
      default: return 0
    }
  }

  const rotationMax = getRotationMax()

  return (
    <div className="sprites-controls">
      <h3>Controls</h3>
      
      {/* Bunker-specific controls */}
      {selectedType === 'bunker' && (
        <>
          <div className="control-group">
            <label>Bunker Type:</label>
            <select 
              value={bunkerKind} 
              onChange={(e) => dispatch(setBunkerKind(Number(e.target.value) as BunkerKind))}
            >
              <option value="0">Wall</option>
              <option value="1">Diff</option>
              <option value="2">Ground</option>
              <option value="3">Follow</option>
              <option value="4">Generator</option>
            </select>
          </div>
          
          {bunkerKind >= 2 && (
            <div className="control-group">
              <label>Animation Frame: {bunkerVariation}</label>
              <input 
                type="range" 
                min="0" 
                max="7" 
                value={bunkerVariation}
                onChange={(e) => dispatch(setBunkerVariation(Number(e.target.value)))}
              />
            </div>
          )}
        </>
      )}

      {/* Fuel-specific controls */}
      {selectedType === 'fuel' && (
        <div className="control-group">
          <label>Frame:</label>
          <select 
            value={fuelFrame} 
            onChange={(e) => dispatch(setFuelFrame(Number(e.target.value)))}
          >
            <option value="0">Frame 1</option>
            <option value="1">Frame 2</option>
            <option value="2">Frame 3</option>
            <option value="3">Empty Cell</option>
          </select>
        </div>
      )}

      {/* Shard-specific controls */}
      {selectedType === 'shard' && (
        <div className="control-group">
          <label>Shard Kind: {shardKind}</label>
          <input 
            type="range" 
            min="0" 
            max="4" 
            value={shardKind}
            onChange={(e) => dispatch(setShardKind(Number(e.target.value)))}
          />
        </div>
      )}

      {/* Rotation control */}
      {rotationMax > 0 && (
        <div className="control-group">
          <label>
            Rotation: {rotation} ({Math.round(rotation * 360 / (rotationMax + 1))}°)
          </label>
          <input 
            type="range" 
            min="0" 
            max={rotationMax} 
            value={rotation}
            onChange={(e) => dispatch(setRotation(Number(e.target.value)))}
          />
        </div>
      )}

      {/* Mask toggle */}
      {selectedType !== 'shield' && (
        <div className="control-group">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={showMask}
              onChange={() => dispatch(toggleMask())}
            />
            Show Mask
          </label>
        </div>
      )}

      {/* Scale control */}
      <div className="control-group">
        <label>Scale: {scale}x</label>
        <input 
          type="range" 
          min="1" 
          max="8" 
          value={scale}
          onChange={(e) => dispatch(setScale(Number(e.target.value)))}
        />
      </div>

      {/* Info section */}
      <div className="sprite-info">
        <h4>Info</h4>
        {selectedType === 'ship' && (
          <p>Ships have 32 rotations generated from 5 base images. Rotations 0-4 are the base images, 
          5-8 are 90° rotations, and the rest are interpolated or mirrored.</p>
        )}
        {selectedType === 'bunker' && (
          <p>Bunkers come in 5 types. Wall and Diff bunkers can rotate (16 directions). 
          Ground, Follow, and Generator bunkers animate through 8 frames.</p>
        )}
        {selectedType === 'fuel' && (
          <p>Fuel cells animate through 3 frames. The empty cell shows after fuel is collected.</p>
        )}
        {selectedType === 'shard' && (
          <p>Explosion shards come in 5 types (one for each bunker type) with 16 rotations each.</p>
        )}
        {selectedType === 'crater' && (
          <p>Craters are left behind when bunkers are destroyed.</p>
        )}
        {selectedType === 'shield' && (
          <p>The shield appears around the ship when activated.</p>
        )}
      </div>
    </div>
  )
}