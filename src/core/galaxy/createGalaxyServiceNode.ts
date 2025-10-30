/**
 * @fileoverview Node.js-compatible galaxy service for CLI tools
 *
 * This version uses fs.readFileSync instead of fetch() for loading galaxy files
 * from the local file system. Used by validation and other CLI tools.
 */

import { parsePlanet } from '@core/planet'
import type { PlanetState } from '@core/planet'
import { Galaxy } from './methods'
import type { GalaxyHeader, PlanetsBuffer } from './types'
import type { GalaxyService } from './service'
import { readFileSync } from 'fs'

/**
 * Private storage for galaxy data
 */
type GalaxyStorage = {
  header: GalaxyHeader
  planetsBuffer: PlanetsBuffer
  parsedPlanetsCache: Map<number, PlanetState>
}

/**
 * Creates a galaxy service instance for Node.js environments
 * @param initialPath - File system path to the initial galaxy data file
 * @returns Galaxy service with all methods
 */
export function createGalaxyServiceNode(initialPath: string): GalaxyService {
  // Load initial galaxy data from file system
  const buffer = readFileSync(initialPath)
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  )

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
      // Load the new galaxy file from file system
      const buffer = readFileSync(path)
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      )

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
