# Wall Initialization Unit Test Plan

## organizeWallsByKind()

1. organizes walls into separate linked lists by kind
2. creates correct kindPointers for each wall type
3. handles empty wall array
4. handles walls of only one kind
5. maintains linked list order within each kind
6. creates proper nextId chains for each kind

## findFirstWhiteWalls()

1. identifies all NNE walls
2. creates linked list of NNE walls via nextwhId
3. returns empty string when no NNE walls exist
4. maintains order of NNE walls in linked list
5. handles mixed wall types correctly

## detectWallJunctions()

1. finds junctions where wall endpoints are within 3 pixels
2. avoids duplicate junctions at same position
3. sorts junctions by x-coordinate
4. handles walls with identical endpoints
5. detects junctions at both start and end points of walls
6. handles empty wall array
7. handles walls with no junctions

## sortWhitesByX()

1. sorts whites by x-coordinate ascending
2. sorts by y-coordinate when x values are equal
3. maintains stable sort for identical positions
4. handles empty array
5. handles single element array
6. preserves white piece data during sort

## mergeOverlappingWhites()

1. merges whites at identical x,y positions with height 6
2. combines bit patterns using AND operation
3. preserves non-overlapping whites
4. handles whites with different heights at same position
5. handles empty array
6. handles consecutive overlapping whites
7. removes merged whites from result

## findCloseWallPairs()

1. finds wall pairs within 3 pixel threshold
2. checks both endpoints of each wall
3. avoids duplicate pairs
4. optimizes by skipping walls too far apart in x
5. handles empty wall array
6. handles walls with no close neighbors
7. correctly measures endpoint distances

## processCloseWalls()

1. calls oneClose for each wall pair
2. collects all patches from oneClose results
3. collects all wall h1/h2 updates
4. handles empty wall pairs array
5. aggregates updates for same wall from multiple junctions
6. maintains wall ID references in updates

## updateWallOptimization()

1. applies h1/h2 updates to correct walls by ID
2. preserves walls without updates
3. handles multiple updates to same wall
4. handles empty updates array
5. creates new wall objects (immutability)
6. maintains all other wall properties

## oneClose()

1. handles identical wall directions (returns empty)
2. calculates correct direction values from newtype
3. handles all 64 direction combinations
4. generates correct patches for north-north junctions
5. generates correct patches for north-northeast junctions
6. generates correct patches for northeast-northeast junctions
7. generates correct patches for east-east junctions
8. calculates h1/h2 updates for optimization
9. handles walls at different endpoints (start vs end)
10. returns empty patches for non-intersecting directions

## whiteHashMerge()

1. adds hash patterns to whites at junction positions
2. finds whites within tolerance of junctions
3. converts white data using XOR with hash pattern
4. preserves whites not at junctions
5. marks whites with hasj flag after hashing
6. handles background pattern alternation
7. skips whites too close to world edges
8. removes processed junctions from list
9. handles empty whites array
10. handles empty junctions array