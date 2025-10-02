import type {
  CollisionItem,
  CollisionMap,
  CollisionPoint,
  CollisionService,
  CollisionType
} from './types'

/**
 * Initialize a collision map with lines, items, and points.
 *
 * NB: maps should be initialized with static collision objects
 * that are not going to change, as they will not be cleared on a
 * call to reset(). Items that may change should be added via
 * a direct call to one of the service methods after creation
 **/
export function createCollisionService(args: {
  width: number
  height: number
  //lines: CollisionLine[]
  items: CollisionItem[]
}): CollisionService {
  const { width, height, items } = args
  let baseMap: CollisionMap = new Array(width).map(() =>
    new Array(height).map(() => 0)
  )

  items.forEach(item =>
    item.forEach(point => {
      baseMap = addPoint(point, baseMap)
    })
  )

  baseMap = deepFreeze(baseMap)

  let instanceMap = copy2dArray(baseMap)

  return {
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
      if (instanceMap[point.x] === undefined) {
        throw new Error(`Point x value: ${point.x} out of bounds`)
      }
      const result = instanceMap[point.x]![point.y]
      if (result === undefined) {
        throw new Error(`Point y value: ${point.y} out of bounds`)
      }
      return result
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

function copy2dArray<T extends number | string>(orig: T[][]): T[][] {
  return orig.map(row => [...row])
}

function deepFreeze<T>(obj: T): T {
  Object.freeze(obj)
  if (Array.isArray(obj)) {
    obj.forEach(item => deepFreeze(item))
  }
  return obj
}
