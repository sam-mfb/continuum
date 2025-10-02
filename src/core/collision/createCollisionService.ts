import type {
  CollisionItem,
  CollisionLine,
  CollisionPoint,
  CollisionService
} from './types'

/**
 * Initialize a collision map with lines, items, and points.
 *
 * NB: maps should be initialized with static collision objects
 * that are not going to change, as they will not be cleared on a
 * call to reset(). Items that may change should be added via
 * a direct call to one of the service methods after creation
 **/
export function createCollisionService(initial: {
  lines: CollisionLine[]
  items: CollisionItem[]
  points: CollisionPoint[]
}): CollisionService {
  throw new Error('Function not implemented')
}
