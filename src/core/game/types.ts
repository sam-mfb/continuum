/**
 * @fileoverview Core game types
 *
 * Defines minimal type requirements for game logic modules,
 * independent of the full application store structure.
 */

import type { GalaxyService } from '@core/galaxy'
import type { RandomService } from '@/core/shared'
import type { RecordingService } from '@core/recording'
import type { SpriteService } from '@core/sprites'
import type { CollisionService } from '@core/collision'
import type { PlanetState } from '@core/planet'
import type { ShipState } from '@core/ship'
import type { ScreenState } from '@core/screen'
import type { StatusState } from '@core/status'
import type { ShotsState } from '@core/shots'
import type { ExplosionsState } from '@core/explosions'
import type { WallsState } from '@core/walls'
import type { TransitionState } from '@core/transition'
import type { GameState } from './gameSlice'

/**
 * Minimal services needed for core game logic
 */
export type GameLogicServices = {
  galaxyService: GalaxyService
  randomService: RandomService
  recordingService: RecordingService
  spriteService: SpriteService
  collisionService: CollisionService
}

/**
 * Minimal root state shape needed for core game logic
 * Only includes slices that game logic directly accesses
 */
export type GameRootState = {
  game: GameState
  planet: PlanetState
  ship: ShipState
  screen: ScreenState
  status: StatusState
  shots: ShotsState
  explosions: ExplosionsState
  walls: WallsState
  transition: TransitionState
}
