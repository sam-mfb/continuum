import { describe, it, expect } from 'vitest'
import { toUint16Array, toMonochromeBitmap, precomputeFormats } from './service'
import type { SpriteService, SpriteData } from './service'
import { BunkerKind } from '@core/figs'

// Type tests to ensure API is correct
describe('SpriteService Type Tests', () => {
  it('type system prevents invalid variant requests', () => {
    // This is a compile-time test - these would cause TypeScript errors:
    // const service: SpriteService = {} as any
    // service.getShipSprite(15, { variant: 'background1' }) // TS Error - ship doesn't have background variants
    // service.getShieldSprite({ variant: 'mask' }) // TS Error - shield has no options

    // Valid calls compile correctly:
    type ValidShipCall = (service: SpriteService) => SpriteData
    const validShip: ValidShipCall = s => s.getShipSprite(0, { variant: 'def' })
    const validShipMask: ValidShipCall = s =>
      s.getShipSprite(0, { variant: 'mask' })

    type ValidBunkerCall = (service: SpriteService) => SpriteData
    const validBunker: ValidBunkerCall = s =>
      s.getBunkerSprite(BunkerKind.WALL, 0, { variant: 'background1' })

    // Use the functions to satisfy TypeScript
    expect(typeof validShip).toBe('function')
    expect(typeof validShipMask).toBe('function')
    expect(typeof validBunker).toBe('function')
  })
})

// Unit tests for helper functions
describe('SpriteService Helper Functions', () => {
  it('converts Uint8Array to Uint16Array with big-endian encoding', () => {
    const uint8 = new Uint8Array([0xab, 0xcd, 0x12, 0x34])
    const uint16 = toUint16Array(uint8)

    expect(uint16.length).toBe(2)
    expect(uint16[0]).toBe(0xabcd) // Big-endian: high byte first
    expect(uint16[1]).toBe(0x1234)
  })

  it('converts to MonochromeBitmap correctly', () => {
    const data = new Uint8Array([0xff, 0x00, 0xaa, 0x55])
    const bitmap = toMonochromeBitmap(data, 16, 2)

    expect(bitmap.width).toBe(16)
    expect(bitmap.height).toBe(2)
    expect(bitmap.rowBytes).toBe(2)
    expect(bitmap.data).toBeInstanceOf(Uint8Array)
    expect(bitmap.data.length).toBe(4)
    // Should be a copy, not the same array
    expect(bitmap.data).not.toBe(data)
    expect(bitmap.data).toEqual(data)
  })

  it('precomputes all formats correctly', () => {
    const data = new Uint8Array([0x12, 0x34, 0x56, 0x78])
    const sprite = precomputeFormats(data, 16, 2)

    expect(sprite.uint8).toBe(data) // Should be same reference
    expect(sprite.uint16).toBeInstanceOf(Uint16Array)
    expect(sprite.uint16.length).toBe(2)
    expect(sprite.uint16[0]).toBe(0x1234)
    expect(sprite.uint16[1]).toBe(0x5678)

    expect(sprite.bitmap.width).toBe(16)
    expect(sprite.bitmap.height).toBe(2)
    expect(sprite.bitmap.data).toEqual(data)
  })
})
