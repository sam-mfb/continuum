import { Collision } from './constants'
import type {
  CollisionItem,
  CollisionLine,
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
      baseMap = Array.from({ length: width }, () =>
        Array.from({ length: height }, () => Collision.NONE)
      )

      baseMap = deepFreeze(baseMap)

      instanceMap = copy2dArray(baseMap)
    },
    reset: function (): void {
      // this is SIGNIFICANTLY faster than initializing the array
      // which is important since we reset every frame
      instanceMap = copy2dArray(baseMap)
    },
    addPoint: function (point: CollisionPoint): void {
      addPoint(point, instanceMap)
    },
    addItem: function (item: CollisionItem): void {
      item.forEach(point => {
        addPoint(point, instanceMap)
      })
    },
    addLine: function (line: CollisionLine): void {
      addLine(line, instanceMap)
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
    },
    getMap: function (): CollisionMap {
      return instanceMap
    }
  }
}

function addPoint(point: CollisionPoint, originalMap: CollisionMap): void {
  // ignore out of bounds setting (allows sending items that are
  // partially out of bounds)
  if (originalMap[point.x]?.[point.y] === undefined) {
    return
  }
  // don't lower the collision priority if already set higher
  if (originalMap[point.x]![point.y]! > point.collision) {
    return
  }
  originalMap[point.x]![point.y] = point.collision
}

function addLine(line: CollisionLine, originalMap: CollisionMap): void {
  const { startPoint, endPoint, collision, width } = line

  // Calculate raw deltas BEFORE abs() for slope detection
  const rawDx = endPoint.x - startPoint.x
  const rawDy = endPoint.y - startPoint.y

  // Calculate line parameters using Bresenham's algorithm
  const dx = Math.abs(rawDx)
  const dy = Math.abs(rawDy)
  const sx = startPoint.x < endPoint.x ? 1 : -1
  const sy = startPoint.y < endPoint.y ? 1 : -1
  let err = dx - dy

  let x = startPoint.x
  let y = startPoint.y

  // Draw the line with width
  while (true) {
    // Add points for line width (perpendicular to line direction)
    if (width === 1) {
      addPoint({ x, y, collision }, originalMap)
    } else {
      // For wider lines, add points perpendicular to the line direction
      // Determine perpendicular direction based on line slope
      const isVertical = Math.abs(dy) > Math.abs(dx)
      const isHorizontal = dy === 0
      // Check if line is close to diagonal (within some tolerance)
      const isNearDiagonal = Math.abs(Math.abs(dx) - Math.abs(dy)) <= 2

      const hasPositiveSlope =
        (rawDx > 0 && rawDy < 0) || (rawDx < 0 && rawDy > 0)

      // Some adjustments needed to account for original games drawing logic
      for (let w = 0; w < width; w++) {
        if (isVertical) {
          // Line is more vertical, expand horizontally
          addPoint({ x: x + w, y, collision }, originalMap)
        } else if (isHorizontal) {
          // Line is perfectly horizontal, no adjustment needed
          addPoint({ x, y: y + w, collision }, originalMap)
        } else if (isNearDiagonal && hasPositiveSlope) {
          // Line is near-diagonal NW/SE (negative slope), shift down by 1 pixel
          addPoint({ x, y: y + w, collision }, originalMap)
        } else {
          // Other angled lines: shift up by 1 pixel
          addPoint({ x, y: y + w - 1, collision }, originalMap)
        }
      }
    }

    // Check if we've reached the end point
    if (x === endPoint.x && y === endPoint.y) break

    // Bresenham's algorithm step
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }
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
