import { describe, it, expect, beforeEach } from 'vitest'
import { createCollisionService } from '../createCollisionService'
import { Collision } from '../constants'
import type { CollisionService } from '../types'

describe('createCollisionService', () => {
  let service: CollisionService

  beforeEach(() => {
    service = createCollisionService()
    service.initialize({ width: 10, height: 10 })
  })

  describe('initialize', () => {
    it('initializes collision map with specified dimensions', () => {
      service.initialize({ width: 10, height: 20 })
      const map = service.getMap()
      expect(map.length).toBe(10)
      expect(map[0]?.length).toBe(20)
    })

    it('initializes all cells to NONE collision', () => {
      service.initialize({ width: 5, height: 5 })
      const map = service.getMap()
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          expect(map[x]?.[y]).toBe(Collision.NONE)
        }
      }
    })

    it('can be called multiple times to reinitialize', () => {
      service.initialize({ width: 10, height: 10 })
      service.addPoint({ x: 5, y: 5, collision: Collision.LETHAL })

      service.initialize({ width: 20, height: 20 })
      const map = service.getMap()
      expect(map.length).toBe(20)
      expect(map[0]?.length).toBe(20)
      // Point should be cleared by reinitialize
      expect(map[5]?.[5]).toBe(Collision.NONE)
    })
  })

  describe('addPoint', () => {
    it('adds a collision point to the map', () => {
      service.addPoint({ x: 5, y: 5, collision: Collision.LETHAL })
      expect(
        service.checkPoint({ x: 5, y: 5, collision: Collision.NONE })
      ).toBe(Collision.LETHAL)
    })

    it('adds a BOUNCE collision point', () => {
      service.addPoint({ x: 3, y: 7, collision: Collision.BOUNCE })
      expect(
        service.checkPoint({ x: 3, y: 7, collision: Collision.NONE })
      ).toBe(Collision.BOUNCE)
    })

    it('can add multiple points at different locations', () => {
      service.addPoint({ x: 0, y: 0, collision: Collision.LETHAL })
      service.addPoint({ x: 9, y: 9, collision: Collision.BOUNCE })
      service.addPoint({ x: 5, y: 5, collision: Collision.LETHAL })

      expect(
        service.checkPoint({ x: 0, y: 0, collision: Collision.NONE })
      ).toBe(Collision.LETHAL)
      expect(
        service.checkPoint({ x: 9, y: 9, collision: Collision.NONE })
      ).toBe(Collision.BOUNCE)
      expect(
        service.checkPoint({ x: 5, y: 5, collision: Collision.NONE })
      ).toBe(Collision.LETHAL)
    })
  })

  describe('addItem', () => {
    it('adds all points in an item to the map', () => {
      const item = [
        { x: 1, y: 1, collision: Collision.LETHAL },
        { x: 2, y: 2, collision: Collision.LETHAL },
        { x: 3, y: 3, collision: Collision.LETHAL }
      ]

      service.addItem(item)

      expect(
        service.checkPoint({ x: 1, y: 1, collision: Collision.NONE })
      ).toBe(Collision.LETHAL)
      expect(
        service.checkPoint({ x: 2, y: 2, collision: Collision.NONE })
      ).toBe(Collision.LETHAL)
      expect(
        service.checkPoint({ x: 3, y: 3, collision: Collision.NONE })
      ).toBe(Collision.LETHAL)
    })

    it('handles empty items', () => {
      service.addItem([])
      const map = service.getMap()
      expect(map[0]?.[0]).toBe(Collision.NONE)
    })

    it('can add multiple items', () => {
      service.addItem([
        { x: 1, y: 1, collision: Collision.BOUNCE },
        { x: 2, y: 2, collision: Collision.BOUNCE }
      ])
      service.addItem([
        { x: 5, y: 5, collision: Collision.LETHAL },
        { x: 6, y: 6, collision: Collision.LETHAL }
      ])

      expect(
        service.checkPoint({ x: 1, y: 1, collision: Collision.NONE })
      ).toBe(Collision.BOUNCE)
      expect(
        service.checkPoint({ x: 5, y: 5, collision: Collision.NONE })
      ).toBe(Collision.LETHAL)
    })
  })

  describe('checkPoint', () => {
    it('returns NONE for empty cell', () => {
      expect(
        service.checkPoint({ x: 5, y: 5, collision: Collision.NONE })
      ).toBe(Collision.NONE)
    })

    it('returns collision value for cell with collision', () => {
      service.addPoint({ x: 3, y: 7, collision: Collision.BOUNCE })
      expect(
        service.checkPoint({ x: 3, y: 7, collision: Collision.NONE })
      ).toBe(Collision.BOUNCE)
    })

    it('returns LETHAL for lethal collision', () => {
      service.addPoint({ x: 2, y: 4, collision: Collision.LETHAL })
      expect(
        service.checkPoint({ x: 2, y: 4, collision: Collision.NONE })
      ).toBe(Collision.LETHAL)
    })
  })

  describe('checkItem', () => {
    it('returns NONE when item has no collisions', () => {
      const item = [
        { x: 1, y: 1, collision: Collision.NONE },
        { x: 2, y: 2, collision: Collision.NONE }
      ]
      expect(service.checkItem(item)).toBe(Collision.NONE)
    })

    it('returns BOUNCE when item collides with BOUNCE', () => {
      service.addPoint({ x: 3, y: 3, collision: Collision.BOUNCE })
      const item = [
        { x: 1, y: 1, collision: Collision.NONE },
        { x: 3, y: 3, collision: Collision.NONE }
      ]
      expect(service.checkItem(item)).toBe(Collision.BOUNCE)
    })

    it('returns LETHAL when item collides with LETHAL', () => {
      service.addPoint({ x: 5, y: 5, collision: Collision.LETHAL })
      const item = [
        { x: 4, y: 4, collision: Collision.NONE },
        { x: 5, y: 5, collision: Collision.NONE }
      ]
      expect(service.checkItem(item)).toBe(Collision.LETHAL)
    })

    it('returns LETHAL when item collides with both BOUNCE and LETHAL (priority)', () => {
      service.addPoint({ x: 2, y: 2, collision: Collision.BOUNCE })
      service.addPoint({ x: 7, y: 7, collision: Collision.LETHAL })
      const item = [
        { x: 2, y: 2, collision: Collision.NONE },
        { x: 7, y: 7, collision: Collision.NONE }
      ]
      expect(service.checkItem(item)).toBe(Collision.LETHAL)
    })

    it('returns BOUNCE over NONE when item has mixed collisions', () => {
      service.addPoint({ x: 3, y: 3, collision: Collision.BOUNCE })
      const item = [
        { x: 1, y: 1, collision: Collision.NONE }, // No collision
        { x: 3, y: 3, collision: Collision.NONE } // BOUNCE collision
      ]
      expect(service.checkItem(item)).toBe(Collision.BOUNCE)
    })

    it('handles empty items', () => {
      expect(service.checkItem([])).toBe(Collision.NONE)
    })

    it('returns highest priority collision from multiple points', () => {
      service.addPoint({ x: 1, y: 1, collision: Collision.BOUNCE })
      service.addPoint({ x: 2, y: 2, collision: Collision.BOUNCE })
      service.addPoint({ x: 3, y: 3, collision: Collision.LETHAL })

      const item = [
        { x: 1, y: 1, collision: Collision.NONE },
        { x: 2, y: 2, collision: Collision.NONE },
        { x: 3, y: 3, collision: Collision.NONE },
        { x: 4, y: 4, collision: Collision.NONE }
      ]

      expect(service.checkItem(item)).toBe(Collision.LETHAL)
    })
  })

  describe('getMap', () => {
    it('returns the collision map', () => {
      service.initialize({ width: 5, height: 10 })
      const map = service.getMap()
      expect(map).toBeDefined()
      expect(map.length).toBe(5)
      expect(map[0]?.length).toBe(10)
    })

    it('returns map reflecting current collision state', () => {
      service.initialize({ width: 10, height: 10 })
      service.addPoint({ x: 3, y: 7, collision: Collision.LETHAL })

      const map = service.getMap()
      expect(map[3]?.[7]).toBe(Collision.LETHAL)
    })
  })

  describe('integration scenarios', () => {
    it('handles complex collision scenario with multiple items and resets', () => {
      service.initialize({ width: 20, height: 20 })

      // Add initial collisions
      service.addItem([
        { x: 5, y: 5, collision: Collision.BOUNCE },
        { x: 6, y: 6, collision: Collision.BOUNCE }
      ])
      service.addPoint({ x: 10, y: 10, collision: Collision.LETHAL })

      // Check item that hits both
      const item = [
        { x: 5, y: 5, collision: Collision.NONE },
        { x: 10, y: 10, collision: Collision.NONE }
      ]
      expect(service.checkItem(item)).toBe(Collision.LETHAL)

      // Reset and verify clean state
      service.initialize({ width: 20, height: 20 })
      expect(service.checkItem(item)).toBe(Collision.NONE)

      // Add new collision and check
      service.addPoint({ x: 5, y: 5, collision: Collision.LETHAL })
      expect(
        service.checkPoint({ x: 5, y: 5, collision: Collision.NONE })
      ).toBe(Collision.LETHAL)
    })

    it('maintains collision priority throughout operations', () => {
      service.initialize({ width: 10, height: 10 })

      // Add BOUNCE first
      service.addPoint({ x: 5, y: 5, collision: Collision.BOUNCE })
      expect(
        service.checkPoint({ x: 5, y: 5, collision: Collision.NONE })
      ).toBe(Collision.BOUNCE)

      // Add LETHAL on top (should take priority or replace)
      service.addPoint({ x: 5, y: 5, collision: Collision.LETHAL })
      expect(
        service.checkPoint({ x: 5, y: 5, collision: Collision.NONE })
      ).toBe(Collision.LETHAL)
    })
  })
})
