import { Collision } from './constants'
import type {
  CollisionItem,
  CollisionMap,
  CollisionPoint,
  CollisionService,
  CollisionType
} from './types'
import { deepFreeze, copy2dArray } from './utils'

/**
 * Initialize a collision map with lines, items, and points.
 *
 * NB: maps should be initialized with static collision objects
 * that are not going to change, as they will not be cleared on a
 * call to reset(). Items that may change should be added via
 * a direct call to one of the service methods after creation
 **/
export function createCollisionService(): CollisionService {
  let baseMap: CollisionMap
  let instanceMap: CollisionMap
  return {
    initialize: function (args: { width: number; height: number }): void {
      const { width, height } = args
      baseMap = new Array(width).map(() => new Array(height).map(() => 0))

      baseMap = deepFreeze(baseMap)

      instanceMap = copy2dArray(baseMap)
    },
    reset: function (): void {
      instanceMap = copy2dArray(baseMap)
    },
    addPoint: function (point: CollisionPoint): void {
      instanceMap = addPoint(point, instanceMap)
    },
    addItem: function (item: CollisionItem): void {
      item.forEach(point => {
        instanceMap = addPoint(point, instanceMap)
      })
    },
    checkPoint: function (point: CollisionPoint): CollisionType {
      return checkPoint(point, instanceMap)
    },
    checkItem: function (item: CollisionItem): CollisionType {
      let priorityCollision: CollisionType = Collision.NONE
      for (const point of item) {
        const collision = checkPoint(point, instanceMap)
        if (collision > priorityCollision) {
          priorityCollision = collision
          if (priorityCollision === Collision.LETHAL) {
            return Collision.LETHAL
          }
        }
      }
      return priorityCollision
    }
  }
}

function addPoint(
  point: CollisionPoint,
  originalMap: CollisionMap
): CollisionMap {
  const newMap = copy2dArray(originalMap)
  if (newMap[point.x] === undefined) {
    throw new Error(`Point x value: ${point.x} out of bounds`)
  }
  newMap[point.x]![point.y] = point.collision
  return newMap
}
function checkPoint(
  point: CollisionPoint,
  originalMap: CollisionMap
): CollisionType {
  if (originalMap[point.x] === undefined) {
    throw new Error(`Point x value: ${point.x} out of bounds`)
  }
  const result = originalMap[point.x]![point.y]
  if (result === undefined) {
    throw new Error(`Point y value: ${point.y} out of bounds`)
  }
  return result
}
