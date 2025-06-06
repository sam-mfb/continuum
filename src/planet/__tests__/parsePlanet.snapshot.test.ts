import { readBinaryFileSync } from '@/file/fileReader'
import { describe, expect, it } from 'vitest'
import { join } from 'path'
import { Galaxy } from '@/galaxy/methods'
import { parsePlanet } from '../parsePlanet'
import { LineType, LineDirection, BunkerKind } from '../types'

describe('parsePlanet snapshot', () => {
  it('parses planet 1 from sample galaxy matching known values', () => {
    const galaxyPath = join(
      __dirname,
      '../../galaxy/__tests__/sample_galaxy.bin'
    )
    const galaxyBuffer = readBinaryFileSync(galaxyPath)
    const { headerBuffer, planetsBuffer } = Galaxy.splitBuffer(galaxyBuffer)
    const header = Galaxy.parseHeader(headerBuffer)

    const planet = parsePlanet(planetsBuffer, header.indexes, 1)

    // Simple smoke test - just verify basic structure with one item per array
    const expectedFirstLine = {
      startx: 38,
      starty: 43,
      length: 615,
      up_down: 1,
      type: LineType.N,
      kind: 0, // LineKind.NORMAL
      endx: 38,
      endy: 658,
      newType: LineDirection.S
    }

    const expectedFirstBunker = {
      x: 98,
      y: 561,
      rot: 0,
      alive: true,
      ranges: [
        {
          low: 15,
          high: 472
        },
        {
          low: 40,
          high: 100
        }
      ],
      kind: BunkerKind.GENERATOR
    }

    const expectedFirstFuel = {
      x: 74,
      y: 629,
      alive: true,
      currentfig: 1,
      figcount: 1
    }

    const expectedFirstCrater = { x: 0, y: 0 }

    // Test basic properties
    expect(planet.worldwidth).toBe(700)
    expect(planet.worldheight).toBe(700)
    expect(planet.worldwrap).toBe(false)
    expect(planet.shootslow).toBe(15)
    expect(planet.xstart).toBe(458)
    expect(planet.ystart).toBe(345)
    expect(planet.planetbonus).toBe(1500)
    expect(planet.gravx).toBe(0)
    expect(planet.gravy).toBe(0)
    expect(planet.numcraters).toBe(0)

    // Test arrays exist and have expected lengths
    expect(planet.lines.length).toBe(56)
    expect(planet.bunkers.length).toBe(16)
    expect(planet.fuels.length).toBe(15)
    expect(planet.craters.length).toBe(25)

    // Test just the first item in each array
    expect(planet.lines[0]).toEqual(expectedFirstLine)
    expect(planet.bunkers[0]).toEqual(expectedFirstBunker)
    expect(planet.fuels[0]).toEqual(expectedFirstFuel)
    expect(planet.craters[0]).toEqual(expectedFirstCrater)
  })

  it('creates complete snapshot of planet 1', () => {
    const galaxyPath = join(
      __dirname,
      '../../galaxy/__tests__/sample_galaxy.bin'
    )
    const galaxyBuffer = readBinaryFileSync(galaxyPath)
    const { headerBuffer, planetsBuffer } = Galaxy.splitBuffer(galaxyBuffer)
    const header = Galaxy.parseHeader(headerBuffer)

    const planet = parsePlanet(planetsBuffer, header.indexes, 1)

    // This creates a full snapshot that can be used to detect any regression
    expect(planet).toMatchSnapshot()
  })

  it('creates snapshots for all planets in galaxy', () => {
    const galaxyPath = join(
      __dirname,
      '../../galaxy/__tests__/sample_galaxy.bin'
    )
    const galaxyBuffer = readBinaryFileSync(galaxyPath)
    const { headerBuffer, planetsBuffer } = Galaxy.splitBuffer(galaxyBuffer)
    const header = Galaxy.parseHeader(headerBuffer)

    // Parse all planets and create snapshots
    for (let i = 1; i <= header.planets; i++) {
      const planet = parsePlanet(planetsBuffer, header.indexes, i)
      expect(planet).toMatchSnapshot(`Planet ${i}`)
    }
  })
})
