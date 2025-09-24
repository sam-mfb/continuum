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
import { startShipDeath, startExplosion } from '@core/explosions'
import {
  playDiscrete,
  setThrusting,
  setShielding,
  SoundType
} from '@core/sound'
import { statusSlice } from '@core/status'
import type { RootState } from './store'

/**
 * Trigger ship death sequence - extracted for reuse
 * Handles all death logic including bunker destruction, explosions, and sounds
 * Based on Play.c:338-346 and related death handling code
 */
export const triggerShipDeath = (store: Store<RootState>): void => {
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
        // Play bunker explosion sound - Play.c:368
        store.dispatch(playDiscrete(SoundType.EXP1_SOUND))

        // Award score for bunker destruction (Play.c:365-366)
        store.dispatch(
          statusSlice.actions.scoreBunker({
            kind: bunker.kind,
            rot: bunker.rot
          })
        )
      }

      // Trigger bunker explosion
      store.dispatch(
        startExplosion({
          x: bunker.x,
          y: bunker.y,
          dir: bunker.rot,
          kind: bunker.kind
        })
      )
      break // Only kill ONE bunker per death (Play.c:345)
    }
  }

  // (c) Start ship explosion
  store.dispatch(startShipDeath({ x: deathGlobalX, y: deathGlobalY }))

  // (d) Play ship explosion sound (high priority) - Terrain.c:414
  store.dispatch(playDiscrete(SoundType.EXP2_SOUND))

  // (e) Stop any continuous sounds when ship dies
  store.dispatch(setThrusting(false))
  store.dispatch(setShielding(false))
}
