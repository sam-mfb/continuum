import React from 'react'
import { useAppDispatch, useAppSelector } from '../store/store'
import { selectPlanet } from '../store/galaxySlice'

export const PlanetList: React.FC = () => {
  const dispatch = useAppDispatch()
  const { planets, selectedPlanetIndex } = useAppSelector(state => state.galaxy)

  const handleSelectPlanet = (index: number): void => {
    dispatch(selectPlanet(index))
  }

  if (planets.length === 0) {
    return (
      <div className="planet-list empty">
        <p>No galaxy loaded</p>
      </div>
    )
  }

  return (
    <div className="planet-list">
      <h3>Planets</h3>
      <ul>
        {planets.map((planet, index) => (
          <li
            key={index}
            className={selectedPlanetIndex === index ? 'selected' : ''}
            onClick={() => handleSelectPlanet(index)}
          >
            <div className="planet-item">
              <span className="planet-number">
                Planet {index + 1}
                {planet.worldwrap && ' 🔄'}
              </span>
              <span className="planet-info">
                {planet.worldwidth}x{planet.worldheight} | Gravity:{' '}
                {planet.gravx},{planet.gravy}
                {planet.worldwrap && ' | Circular'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
