/**
 * Ship Death Module
 *
 * Handles all death logic including bunker destruction,
 * explosions, and death sounds.
 */

import type { Store } from '@reduxjs/toolkit'
import { shipSlice, SKILLBRADIUS } from '@core/ship'
import { xyindist } from '@core/shots'
import { killBunker, legalAngle } from '@core/planet'
import {
  startShipDeathWithRandom,
  startExplosionWithRandom
} from '@core/explosions'
import {
  EXPLSHARDS,
  EXPLSPARKS,
  SHIPSPARKS,
  SH_DISTRIB,
  SH_LIFE,
  SH_ADDLIFE,
  SH_SPEED,
  SH_ADDSPEED,
  SH_SPIN2,
  SPARKLIFE,
  SPADDLIFE,
  SP_SPEED16,
  SH_SPARKLIFE,
  SH_SPADDLIFE,
  SH_SP_SPEED16
} from '@core/explosions/constants'
import { statusSlice } from '@core/status'
import type { RootState } from '@/game/store'
import type { RandomService } from '@/core/shared'

/**
 * Trigger ship death sequence - extracted for reuse
 * Handles all death logic including bunker destruction, explosions, and sounds
 * Based on Play.c:338-346 and related death handling code
 */
export const triggerShipDeath = (
  store: Store<RootState>,
  randomService: RandomService
): void => {
  // (a) Update ship state
  store.dispatch(shipSlice.actions.killShip())

  // (b) Death blast - destroy ONE nearby bunker (Play.c:338-346)
  // Use global position from state (already calculated by containShip)
  const deathState = store.getState()
  const deathGlobalX = deathState.ship.globalx
  const deathGlobalY = deathState.ship.globaly

  // Only kills bunkers in field of view for directional types
  const bunkers = deathState.planet.bunkers
  const BUNKROTKINDS = 2 // Kinds 0-1 are directional, 2+ are omnidirectional

  for (let index = 0; index < bunkers.length; index++) {
    const bunker = bunkers[index]!

    // Match original C logic: stop at first bunker with negative rot (sentinel value)
    // This marks the end of active bunkers in the array
    if (bunker.rot < 0) {
      break
    }

    if (
      bunker.alive &&
      xyindist(
        bunker.x - deathGlobalX,
        bunker.y - deathGlobalY,
        SKILLBRADIUS
      ) &&
      (bunker.kind >= BUNKROTKINDS || // Omnidirectional bunkers always killable
        legalAngle(bunker.rot, bunker.x, bunker.y, deathGlobalX, deathGlobalY)) // Directional need angle check
    ) {
      store.dispatch(killBunker({ index }))

      // Check if bunker was actually destroyed (difficult bunkers might survive)
      const updatedBunker = store.getState().planet.bunkers[index]
      if (!updatedBunker || !updatedBunker.alive) {
        // Award score for bunker destruction (Play.c:365-366)
        store.dispatch(
          statusSlice.actions.scoreBunker({
            kind: bunker.kind,
            rot: bunker.rot
          })
        )
      }

      // Trigger bunker explosion
      // Generate random values for explosion
      const shardRandom = []
      for (let i = 0; i < EXPLSHARDS; i++) {
        const xOffset =
          randomService.rnumber(SH_DISTRIB) - Math.floor(SH_DISTRIB / 2)
        const yOffset =
          randomService.rnumber(SH_DISTRIB) - Math.floor(SH_DISTRIB / 2)
        const lifetime = SH_LIFE + randomService.rnumber(SH_ADDLIFE)
        let angle: number
        if (bunker.kind >= 2) {
          // Rotating bunkers: random direction
          angle = randomService.rnumber(32)
        } else {
          // Static bunkers: directional spread
          angle = (randomService.rnumber(15) - 7 + (bunker.rot << 1)) & 31
        }
        const speed = SH_SPEED + randomService.rnumber(SH_ADDSPEED)
        const rot16 = randomService.rnumber(256)
        const rotspeed =
          randomService.rnumber(SH_SPIN2) - Math.floor(SH_SPIN2 / 2)

        shardRandom.push({
          xOffset,
          yOffset,
          lifetime,
          angle,
          speed,
          rot16,
          rotspeed
        })
      }

      const sparkRandom = []
      const loangle = bunker.kind >= 2 ? 0 : ((bunker.rot - 4) & 15) << 5
      const hiangle = bunker.kind >= 2 ? 511 : loangle + 256

      for (let i = 0; i < EXPLSPARKS; i++) {
        const lifetime = SPARKLIFE + randomService.rnumber(SPADDLIFE)
        const angle = randomService.rnumber(hiangle - loangle + 1) + loangle
        const speed = 8 + randomService.rnumber(SP_SPEED16)

        sparkRandom.push({ lifetime, angle, speed })
      }

      store.dispatch(
        startExplosionWithRandom({
          x: bunker.x,
          y: bunker.y,
          dir: bunker.rot,
          kind: bunker.kind,
          shardRandom,
          sparkRandom
        })
      )
      break // Only kill ONE bunker per death (Play.c:345)
    }
  }

  // (c) Start ship explosion
  // Generate random values for ship sparks
  const shipSparkRandom = []
  for (let i = 0; i < SHIPSPARKS; i++) {
    const lifetime = SH_SPARKLIFE + randomService.rnumber(SH_SPADDLIFE)
    const angle = randomService.rnumber(512)
    const speed = 16 + randomService.rnumber(SH_SP_SPEED16)

    shipSparkRandom.push({ lifetime, angle, speed })
  }

  store.dispatch(
    startShipDeathWithRandom({
      x: deathGlobalX,
      y: deathGlobalY,
      sparkRandom: shipSparkRandom
    })
  )
}
