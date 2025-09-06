import { readBinaryFileSync } from '@dev/file/fileReader'
import { describe, expect, it } from 'vitest'
import { join } from 'path'
import { Galaxy } from '../methods'
import { GALAXY } from '../constants'

describe('splitBuffer', () => {
  it('returns a properly sized galaxy header', () => {
    const galaxyPath = join(__dirname, 'sample_galaxy.bin')
    const galaxyBuffer = readBinaryFileSync(galaxyPath)
    const { headerBuffer } = Galaxy.splitBuffer(galaxyBuffer)
    expect(headerBuffer.byteLength).toEqual(GALAXY.HEADER_BYTES)
  })

  it('throws on an invalid galaxy buffer', () => {
    // Buffer too small to contain header
    const tooSmallBuffer = new ArrayBuffer(100)
    expect(() => Galaxy.splitBuffer(tooSmallBuffer)).toThrow()

    // Empty buffer
    const emptyBuffer = new ArrayBuffer(0)
    expect(() => Galaxy.splitBuffer(emptyBuffer)).toThrow()
  })
})

describe('parseHeader', () => {
  it('properly parses galaxy header', () => {
    const galaxyPath = join(__dirname, 'sample_galaxy.bin')
    const galaxyBuffer = readBinaryFileSync(galaxyPath)
    const { headerBuffer } = Galaxy.splitBuffer(galaxyBuffer)
    const header = Galaxy.parseHeader(headerBuffer)

    // We know these are the values in the test file
    expect(header.planets).toEqual(5)
    expect(header.cartplanet).toEqual(0)
  })
})
