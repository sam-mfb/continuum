/**
 * @fileoverview Galaxy service for managing galaxy data outside of Redux
 *
 * This service provides a centralized way to load and cache galaxy data
 */

import { parsePlanet } from '@core/planet'
import type { PlanetState } from '@core/planet'
import { Galaxy } from './methods'
import type { GalaxyHeader, PlanetsBuffer } from './types'

/**
 * Galaxy service interface
 */
export type GalaxyService = {
  /**
   * Load galaxy data from a file
   * @param path - Path to the galaxy data file
   */
  loadGalaxy(path: string): Promise<GalaxyHeader>

  /**
   * Get the cached galaxy header
   * @returns Galaxy header
   */
  getHeader(): GalaxyHeader

  /**
   * Get the cached planets buffer
   * @returns Planets buffer
   */
  getPlanetsBuffer(): PlanetsBuffer

  /**
   * Parse and return a specific planet
   * @param levelNum - Planet number (1-based)
   * @returns Parsed planet state
   */
  getPlanet(levelNum: number): PlanetState

  /**
   * Parse and return all planets
   * @returns Array of all parsed planets
   */
  getAllPlanets(): PlanetState[]
}

/**
 * Private storage for galaxy data
 */
type GalaxyStorage = {
  header: GalaxyHeader
  planetsBuffer: PlanetsBuffer
  parsedPlanetsCache: Map<number, PlanetState>
}

/**
 * Creates a galaxy service instance with an initially loaded galaxy
 * @param initialPath - Path to the initial galaxy data file
 * @returns Promise that resolves to a galaxy service with all methods
 */
export async function createGalaxyService(
  initialPath: string
): Promise<GalaxyService> {
  // Load initial galaxy data
  const response = await fetch(initialPath)
  if (!response.ok) {
    throw new Error(`Failed to load initial galaxy file from ${initialPath}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const { headerBuffer, planetsBuffer } = Galaxy.splitBuffer(arrayBuffer)
  const header = Galaxy.parseHeader(headerBuffer)

  // Private storage - not accessible outside the service
  const storage: GalaxyStorage = {
    header,
    planetsBuffer,
    parsedPlanetsCache: new Map()
  }

  console.log(`Initial galaxy loaded: ${header.planets} planets`)

  const service: GalaxyService = {
    async loadGalaxy(path: string): Promise<GalaxyHeader> {
      // Fetch the new galaxy file
      const response = await fetch(path)
      if (!response.ok) {
        throw new Error(`Failed to load galaxy file from ${path}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const { headerBuffer, planetsBuffer } = Galaxy.splitBuffer(arrayBuffer)
      const header = Galaxy.parseHeader(headerBuffer)

      // Atomic swap - only update storage after successful load
      storage.header = header
      storage.planetsBuffer = planetsBuffer
      storage.parsedPlanetsCache.clear() // Clear any previously parsed planets

      console.log(`Galaxy loaded: ${header.planets} planets`)

      return header
    },

    getHeader(): GalaxyHeader {
      return storage.header
    },

    getPlanetsBuffer(): PlanetsBuffer {
      return storage.planetsBuffer
    },

    getPlanet(levelNum: number): PlanetState {
      // Check cache first
      if (storage.parsedPlanetsCache.has(levelNum)) {
        return storage.parsedPlanetsCache.get(levelNum)!
      }

      // Parse and cache the planet
      const planet = parsePlanet(
        storage.planetsBuffer,
        storage.header.indexes,
        levelNum
      )

      // Check if walls are sorted by startx (required for optimizations)
      const walls = planet.lines
      let isSorted = true
      for (let i = 1; i < walls.length; i++) {
        const current = walls[i]
        const previous = walls[i - 1]
        if (current && previous && current.startx < previous.startx) {
          isSorted = false
          break
        }
      }

      planet.wallsSorted = isSorted

      if (!isSorted) {
        console.warn(
          `Planet ${levelNum}: Walls are NOT sorted by startx. ` +
            `This may cause collision detection and junction finding issues.`
        )
      }

      storage.parsedPlanetsCache.set(levelNum, planet)
      return planet
    },

    getAllPlanets(): PlanetState[] {
      const planets: PlanetState[] = []
      for (let i = 1; i <= storage.header.planets; i++) {
        planets.push(service.getPlanet(i))
      }
      return planets
    }
  }

  return service
}
