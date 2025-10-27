import { describe, it, expect } from 'vitest'
import { createRandomService } from './RandomService'

describe('RandomService', () => {
  describe('determinism', () => {
    it('produces identical sequences with the same seed', () => {
      const service1 = createRandomService()
      const service2 = createRandomService()

      service1.setSeed(12345)
      service2.setSeed(12345)

      const sequence1 = Array.from({ length: 100 }, () =>
        service1.rnumber(1000)
      )
      const sequence2 = Array.from({ length: 100 }, () =>
        service2.rnumber(1000)
      )

      expect(sequence1).toEqual(sequence2)
    })

    it('produces different sequences with different seeds', () => {
      const service1 = createRandomService()
      const service2 = createRandomService()

      service1.setSeed(12345)
      service2.setSeed(54321)

      const sequence1 = Array.from({ length: 100 }, () =>
        service1.rnumber(1000)
      )
      const sequence2 = Array.from({ length: 100 }, () =>
        service2.rnumber(1000)
      )

      expect(sequence1).not.toEqual(sequence2)
    })

    it('can reset to the same sequence by reusing a seed', () => {
      const service = createRandomService()

      service.setSeed(99999)
      const firstRun = Array.from({ length: 50 }, () => service.rnumber(100))

      service.setSeed(99999)
      const secondRun = Array.from({ length: 50 }, () => service.rnumber(100))

      expect(firstRun).toEqual(secondRun)
    })

    it('produces the same sequence across multiple service instances', () => {
      const seed = 42

      const service1 = createRandomService()
      service1.setSeed(seed)
      const sequence1 = Array.from({ length: 200 }, () => service1.rnumber(500))

      const service2 = createRandomService()
      service2.setSeed(seed)
      const sequence2 = Array.from({ length: 200 }, () => service2.rnumber(500))

      const service3 = createRandomService()
      service3.setSeed(seed)
      const sequence3 = Array.from({ length: 200 }, () => service3.rnumber(500))

      expect(sequence1).toEqual(sequence2)
      expect(sequence2).toEqual(sequence3)
    })
  })

  describe('rnumber behavior', () => {
    it('returns integers in the correct range [0, n)', () => {
      const service = createRandomService()
      service.setSeed(123456)

      const max = 100
      const samples = Array.from({ length: 1000 }, () => service.rnumber(max))

      samples.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(max)
        expect(Number.isInteger(value)).toBe(true)
      })
    })

    it('produces varied distribution across range', () => {
      const service = createRandomService()
      service.setSeed(789)

      const samples = Array.from({ length: 10000 }, () => service.rnumber(10))
      const counts = new Array(10).fill(0)

      samples.forEach(value => {
        counts[value]++
      })

      // Each bucket should have roughly 1000 samples (10000 / 10)
      // Allow for variance - check each bucket has at least 800 and at most 1200
      counts.forEach(count => {
        expect(count).toBeGreaterThan(800)
        expect(count).toBeLessThan(1200)
      })
    })

    it('handles edge case of rnumber(1)', () => {
      const service = createRandomService()
      service.setSeed(555)

      const samples = Array.from({ length: 100 }, () => service.rnumber(1))

      samples.forEach(value => {
        expect(value).toBe(0)
      })
    })

    it('handles large range values', () => {
      const service = createRandomService()
      service.setSeed(777)

      const max = 10000
      const samples = Array.from({ length: 1000 }, () => service.rnumber(max))

      samples.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(max)
        expect(Number.isInteger(value)).toBe(true)
      })
    })
  })

  describe('getSeed', () => {
    it('returns the seed that was set', () => {
      const service = createRandomService()
      const seed = 314159

      service.setSeed(seed)

      expect(service.getSeed()).toBe(seed)
    })

    it('tracks seed changes', () => {
      const service = createRandomService()

      service.setSeed(100)
      expect(service.getSeed()).toBe(100)

      service.setSeed(200)
      expect(service.getSeed()).toBe(200)

      service.setSeed(300)
      expect(service.getSeed()).toBe(300)
    })
  })

  describe('known sequence verification', () => {
    it('produces expected first 10 values for seed 12345', () => {
      const service = createRandomService()
      service.setSeed(12345)

      // Generate first 10 values with rnumber(100)
      const sequence = Array.from({ length: 10 }, () => service.rnumber(100))

      // This snapshot ensures the algorithm stays consistent
      // If this test fails after code changes, the RNG algorithm may have changed
      expect(sequence).toEqual([97, 30, 48, 81, 50, 34, 7, 76, 99, 82])
    })

    it('produces expected first 10 values for seed 99999', () => {
      const service = createRandomService()
      service.setSeed(99999)

      const sequence = Array.from({ length: 10 }, () => service.rnumber(100))

      expect(sequence).toEqual([97, 52, 60, 68, 12, 1, 97, 98, 16, 89])
    })
  })

  describe('gameplay simulation', () => {
    it('simulates bunker shooting with deterministic results', () => {
      // Simulate 100 frames of bunker shooting decision
      // shootslow threshold is typically around 12 (12% chance)
      const service = createRandomService()
      service.setSeed(42)

      const shootslow = 12
      const frames = 100
      const shootingFrames: number[] = []

      for (let frame = 0; frame < frames; frame++) {
        const shootRoll = service.rnumber(100)
        if (shootRoll < shootslow) {
          shootingFrames.push(frame)
        }
      }

      // Reset and run again - should get same frames
      service.setSeed(42)
      const shootingFrames2: number[] = []

      for (let frame = 0; frame < frames; frame++) {
        const shootRoll = service.rnumber(100)
        if (shootRoll < shootslow) {
          shootingFrames2.push(frame)
        }
      }

      expect(shootingFrames).toEqual(shootingFrames2)
      expect(shootingFrames.length).toBeGreaterThan(0) // Should shoot at least once
      expect(shootingFrames.length).toBeLessThan(frames) // Should not shoot every frame
    })

    it('simulates shot angle selection with deterministic results', () => {
      // Simulate selecting random shot angles
      const service = createRandomService()
      service.setSeed(777)

      // Typical range is angle ± 2, so range of 5 values
      const loangle = 100
      const hiangle = 104

      const angles = Array.from(
        { length: 50 },
        () => service.rnumber(hiangle - loangle + 1) + loangle
      )

      // Reset and generate again
      service.setSeed(777)
      const angles2 = Array.from(
        { length: 50 },
        () => service.rnumber(hiangle - loangle + 1) + loangle
      )

      expect(angles).toEqual(angles2)

      // All angles should be in valid range
      angles.forEach(angle => {
        expect(angle).toBeGreaterThanOrEqual(loangle)
        expect(angle).toBeLessThanOrEqual(hiangle)
      })
    })
  })
})
