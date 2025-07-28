import React from 'react'
import { useAppSelector, useAppDispatch } from '../../store/store'
import { setSelectedType, type SpriteType } from '../../store/spritesSlice'

const spriteTypes: { type: SpriteType; name: string; description: string }[] = [
  {
    type: 'ship',
    name: 'Ship',
    description: '32 rotations from 5 base images'
  },
  {
    type: 'bunker',
    name: 'Bunker',
    description: '5 types with various rotations'
  },
  {
    type: 'fuel',
    name: 'Fuel Cell',
    description: '6 normal + 2 draining + empty'
  },
  {
    type: 'shard',
    name: 'Explosion Shard',
    description: '5 types with 16 rotations each'
  },
  {
    type: 'crater',
    name: 'Crater',
    description: 'Left after bunker destruction'
  },
  {
    type: 'shield',
    name: 'Shield',
    description: 'Ship protection bubble'
  },
  {
    type: 'flame',
    name: 'Flame',
    description: '32 thruster animation frames'
  },
  {
    type: 'strafe',
    name: 'Strafe',
    description: '16 side-thruster orientations'
  },
  {
    type: 'digit',
    name: 'Characters',
    description: 'Numbers, letters, and icons'
  }
]

export const SpritesList: React.FC = () => {
  const dispatch = useAppDispatch()
  const { selectedType, loadingState } = useAppSelector(state => state.sprites)

  return (
    <div className="sprites-list">
      <h3>Sprite Types</h3>
      {loadingState === 'loading' && <div>Loading sprites...</div>}
      <ul className="sprite-type-list">
        {spriteTypes.map(({ type, name, description }) => (
          <li
            key={type}
            className={`sprite-type-item ${selectedType === type ? 'selected' : ''}`}
            onClick={() => dispatch(setSelectedType(type))}
          >
            <div className="sprite-type-name">{name}</div>
            <div className="sprite-type-description">{description}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}