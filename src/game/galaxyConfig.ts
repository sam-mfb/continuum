/**
 * @fileoverview Galaxy configuration and metadata
 * Defines all available galaxies with their IDs, names, and file paths
 */

export type GalaxyConfig = {
  id: string
  name: string
  path: string
}

/**
 * All available galaxies in the game
 * IDs are used as keys for high score tables and localStorage
 */
export const GALAXIES: readonly GalaxyConfig[] = [
  {
    id: 'release',
    name: 'Release Galaxy',
    path: '/release_galaxy.bin'
  },
  {
    id: 'continuum',
    name: 'Continuum Galaxy',
    path: '/galaxies/continuum_galaxy.bin'
  },
  {
    id: 'training_wheels',
    name: 'Training Wheels',
    path: '/galaxies/training_wheels.bin'
  },
  {
    id: 'wonderful',
    name: 'Wonderful Galaxy',
    path: '/galaxies/wonderful_galaxy.bin'
  },
  {
    id: 'andys',
    name: "Andy's Galaxy",
    path: '/galaxies/andys_galaxy.bin'
  },
  {
    id: 'spacewarp',
    name: 'Spacewarp',
    path: '/galaxies/spacewarp.bin'
  },
  {
    id: 'galaxy_of_fun',
    name: 'Galaxy of Fun',
    path: '/galaxies/galaxy_of_fun.bin'
  },
  {
    id: 'zephyrs_short',
    name: "Zephyr's Short",
    path: '/galaxies/zephyrs_short.bin'
  },
  {
    id: 'boogieman',
    name: 'Boogieman Galaxy',
    path: '/galaxies/boogieman_galaxy.bin'
  },
  {
    id: 'dad_13',
    name: 'Dad 13 Planets',
    path: '/galaxies/dad_13_planets.bin'
  },
  {
    id: 'eternity',
    name: 'Eternity',
    path: '/galaxies/eternity.bin'
  }
] as const

/**
 * Default galaxy to load on game start
 */
export const DEFAULT_GALAXY_ID = 'release'

/**
 * Get galaxy configuration by ID
 */
export const getGalaxyById = (id: string): GalaxyConfig | undefined => {
  return GALAXIES.find(galaxy => galaxy.id === id)
}

/**
 * Get the default galaxy configuration
 */
export const getDefaultGalaxy = (): GalaxyConfig => {
  const defaultGalaxy = getGalaxyById(DEFAULT_GALAXY_ID)
  if (!defaultGalaxy) {
    throw new Error(`Default galaxy '${DEFAULT_GALAXY_ID}' not found`)
  }
  return defaultGalaxy
}

/**
 * Get all galaxy IDs
 */
export const getGalaxyIds = (): string[] => {
  return GALAXIES.map(g => g.id)
}
