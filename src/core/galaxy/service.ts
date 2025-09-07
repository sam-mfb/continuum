/**
 * @fileoverview Galaxy service for managing galaxy data outside of Redux
 * 
 * This service follows the same singleton pattern as the sprite service,
 * providing a centralized way to load and cache galaxy data without
 * storing non-serializable ArrayBuffers in Redux state.
 */

import { ASSET_PATHS } from '@core/constants'
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
   * @param path - Optional custom path, defaults to ASSET_PATHS.GALAXY_DATA
   */
  loadGalaxy(path?: string): Promise<GalaxyHeader>
  
  /**
   * Get the cached galaxy header
   * @returns Galaxy header or null if not loaded
   */
  getHeader(): GalaxyHeader | null
  
  /**
   * Get the cached planets buffer
   * @returns Planets buffer or null if not loaded
   */
  getPlanetsBuffer(): PlanetsBuffer | null
  
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
  
  /**
   * Check if galaxy data is loaded
   */
  isLoaded(): boolean
  
  /**
   * Clear all cached data
   */
  clear(): void
}

/**
 * Private storage for galaxy data
 */
type GalaxyStorage = {
  header: GalaxyHeader | null
  planetsBuffer: PlanetsBuffer | null
  parsedPlanetsCache: Map<number, PlanetState>
}

/**
 * Creates a galaxy service instance
 * @returns Galaxy service with all methods
 */
export function createGalaxyService(): GalaxyService {
  // Private storage - not accessible outside the service
  const storage: GalaxyStorage = {
    header: null,
    planetsBuffer: null,
    parsedPlanetsCache: new Map()
  }
  
  return {
    async loadGalaxy(path: string = ASSET_PATHS.GALAXY_DATA): Promise<GalaxyHeader> {
      // Fetch the galaxy file
      const response = await fetch(path)
      if (!response.ok) {
        throw new Error(`Failed to load galaxy file from ${path}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      const { headerBuffer, planetsBuffer } = Galaxy.splitBuffer(arrayBuffer)
      const header = Galaxy.parseHeader(headerBuffer)
      
      // Store in private cache
      storage.header = header
      storage.planetsBuffer = planetsBuffer
      storage.parsedPlanetsCache.clear() // Clear any previously parsed planets
      
      console.log(`Galaxy loaded: ${header.planets} planets`)
      
      return header
    },
    
    getHeader(): GalaxyHeader | null {
      return storage.header
    },
    
    getPlanetsBuffer(): PlanetsBuffer | null {
      return storage.planetsBuffer
    },
    
    getPlanet(levelNum: number): PlanetState {
      if (!storage.header || !storage.planetsBuffer) {
        throw new Error('Galaxy data not loaded. Call loadGalaxy() first.')
      }
      
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
      
      storage.parsedPlanetsCache.set(levelNum, planet)
      return planet
    },
    
    getAllPlanets(): PlanetState[] {
      if (!storage.header || !storage.planetsBuffer) {
        throw new Error('Galaxy data not loaded. Call loadGalaxy() first.')
      }
      
      const planets: PlanetState[] = []
      for (let i = 1; i <= storage.header.planets; i++) {
        planets.push(this.getPlanet(i))
      }
      return planets
    },
    
    isLoaded(): boolean {
      return storage.header !== null && storage.planetsBuffer !== null
    },
    
    clear(): void {
      storage.header = null
      storage.planetsBuffer = null
      storage.parsedPlanetsCache.clear()
    }
  }
}

// Create and export a singleton instance
let galaxyServiceInstance: GalaxyService | null = null

/**
 * Get the singleton galaxy service instance
 * Creates it if it doesn't exist yet
 */
export function getGalaxyService(): GalaxyService {
  if (!galaxyServiceInstance) {
    galaxyServiceInstance = createGalaxyService()
  }
  return galaxyServiceInstance
}