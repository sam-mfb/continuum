import { readBinaryFileSync } from '@dev/file'
import { describe, expect, it } from 'vitest'
import { join } from 'path'
import { Galaxy } from '@core/galaxy'
import { parsePlanet } from '../parsePlanet'

describe('parsePlanet', () => {
  it('parses planet data from galaxy file', () => {
    const galaxyPath = join(
      __dirname,
      '../../galaxy/__tests__/sample_galaxy.bin'
    )
    const galaxyBuffer = readBinaryFileSync(galaxyPath)
    const { headerBuffer, planetsBuffer } = Galaxy.splitBuffer(galaxyBuffer)
    const header = Galaxy.parseHeader(headerBuffer)

    // Parse the first planet
    const planet = parsePlanet(planetsBuffer, header.indexes, 1)

    // Verify basic planet properties exist
    expect(planet.worldwidth).toBeGreaterThan(0)
    expect(planet.worldheight).toBeGreaterThan(0)
    expect(typeof planet.worldwrap).toBe('boolean')
    expect(planet.shootslow).toBeDefined()
    expect(planet.xstart).toBeDefined()
    expect(planet.ystart).toBeDefined()
    expect(planet.planetbonus).toBeDefined()
    expect(planet.gravx).toBeDefined()
    expect(planet.gravy).toBeDefined()
    expect(planet.numcraters).toBeDefined()

    // Verify arrays exist
    expect(Array.isArray(planet.lines)).toBe(true)
    expect(Array.isArray(planet.bunkers)).toBe(true)
    expect(Array.isArray(planet.fuels)).toBe(true)
    expect(Array.isArray(planet.craters)).toBe(true)
  })

  it('parses all valid lines from planet', () => {
    const galaxyPath = join(
      __dirname,
      '../../galaxy/__tests__/sample_galaxy.bin'
    )
    const galaxyBuffer = readBinaryFileSync(galaxyPath)
    const { headerBuffer, planetsBuffer } = Galaxy.splitBuffer(galaxyBuffer)
    const header = Galaxy.parseHeader(headerBuffer)

    const planet = parsePlanet(planetsBuffer, header.indexes, 1)

    // Verify that all lines have valid coordinates
    planet.lines.forEach(line => {
      expect(line.startx).toBeLessThan(10000) // 10000 is the invalid marker
      expect(line.starty).toBeLessThan(4000)
      expect(line.endx).toBeLessThan(4000)
      expect(line.type).toBeGreaterThanOrEqual(1)
      expect(line.type).toBeLessThanOrEqual(5)
      expect([1, -1]).toContain(line.up_down)
      expect(line.newtype).toBeGreaterThanOrEqual(1)
      expect(line.newtype).toBeLessThanOrEqual(8)
    })
  })

  it('parses all valid bunkers from planet', () => {
    const galaxyPath = join(
      __dirname,
      '../../galaxy/__tests__/sample_galaxy.bin'
    )
    const galaxyBuffer = readBinaryFileSync(galaxyPath)
    const { headerBuffer, planetsBuffer } = Galaxy.splitBuffer(galaxyBuffer)
    const header = Galaxy.parseHeader(headerBuffer)

    const planet = parsePlanet(planetsBuffer, header.indexes, 1)

    // Verify that all bunkers have valid coordinates
    planet.bunkers.forEach(bunker => {
      expect(bunker.x).toBeLessThan(10000) // 10000 is the invalid marker
      expect(bunker.y).toBeLessThan(4000)
      expect(bunker.alive).toBe(true)
      expect(bunker.ranges).toHaveLength(2)
      bunker.ranges.forEach(range => {
        expect(range).toHaveProperty('low')
        expect(range).toHaveProperty('high')
      })
    })
  })

  it('parses all valid fuels from planet', () => {
    const galaxyPath = join(
      __dirname,
      '../../galaxy/__tests__/sample_galaxy.bin'
    )
    const galaxyBuffer = readBinaryFileSync(galaxyPath)
    const { headerBuffer, planetsBuffer } = Galaxy.splitBuffer(galaxyBuffer)
    const header = Galaxy.parseHeader(headerBuffer)

    const planet = parsePlanet(planetsBuffer, header.indexes, 1)

    // Verify that all fuels except the last have valid coordinates
    const validFuels = planet.fuels.slice(0, -1)
    validFuels.forEach(fuel => {
      expect(fuel.x).toBeLessThan(10000) // 10000 is the invalid marker
      expect(fuel.y).toBeLessThan(4000)
      expect(fuel.alive).toBe(true)
      expect(fuel.currentfig).toBe(1)
      expect(fuel.figcount).toBe(1)
    })

    // The last fuel should be marked as invalid per the original code
    if (planet.fuels.length > 0) {
      const lastFuel = planet.fuels[planet.fuels.length - 1]
      expect(lastFuel?.x).toBe(20000)
      expect(lastFuel?.alive).toBe(false)
    }
  })

  it('parses craters from planet', () => {
    const galaxyPath = join(
      __dirname,
      '../../galaxy/__tests__/sample_galaxy.bin'
    )
    const galaxyBuffer = readBinaryFileSync(galaxyPath)
    const { headerBuffer, planetsBuffer } = Galaxy.splitBuffer(galaxyBuffer)
    const header = Galaxy.parseHeader(headerBuffer)

    const planet = parsePlanet(planetsBuffer, header.indexes, 1)

    // Verify craters exist and have proper structure
    expect(planet.craters.length).toBeGreaterThan(0)
    planet.craters.forEach(crater => {
      expect(crater).toHaveProperty('x')
      expect(crater).toHaveProperty('y')
      expect(typeof crater.x).toBe('number')
      expect(typeof crater.y).toBe('number')
    })
  })

  it('throws error for invalid planet index', () => {
    const galaxyPath = join(
      __dirname,
      '../../galaxy/__tests__/sample_galaxy.bin'
    )
    const galaxyBuffer = readBinaryFileSync(galaxyPath)
    const { headerBuffer, planetsBuffer } = Galaxy.splitBuffer(galaxyBuffer)
    const header = Galaxy.parseHeader(headerBuffer)

    // Try to parse a planet that doesn't exist
    expect(() => parsePlanet(planetsBuffer, header.indexes, 999)).toThrow(
      'No planet location noted in index'
    )
  })

  it('parses multiple planets from the same galaxy', () => {
    const galaxyPath = join(
      __dirname,
      '../../galaxy/__tests__/sample_galaxy.bin'
    )
    const galaxyBuffer = readBinaryFileSync(galaxyPath)
    const { headerBuffer, planetsBuffer } = Galaxy.splitBuffer(galaxyBuffer)
    const header = Galaxy.parseHeader(headerBuffer)

    // Parse first few planets (if they exist)
    const numPlanetsToTest = Math.min(3, header.planets)
    const planets = []

    for (let i = 1; i <= numPlanetsToTest; i++) {
      const planet = parsePlanet(planetsBuffer, header.indexes, i)
      planets.push(planet)

      // Each planet should have unique properties
      expect(planet.worldwidth).toBeGreaterThan(0)
      expect(planet.worldheight).toBeGreaterThan(0)
    }

    // Verify we got the expected number of planets
    expect(planets).toHaveLength(numPlanetsToTest)
  })
})
