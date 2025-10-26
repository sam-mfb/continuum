import { createRecordingService } from '@core/recording'
import { decodeRecordingAuto } from '@core/recording/binaryCodec'
import {
  createHeadlessGameEngine,
  createRecordingValidator,
  createHeadlessStore
} from '@core/validation'
import { createGalaxyServiceNode } from '@/core/galaxy/createGalaxyServiceNode'
import { createRandomService } from '@/core/shared'
import { createCollisionService } from '@core/collision'
import { createSpriteServiceNode } from '@core/sprites/createSpriteServiceNode'
import { SCRWTH, VIEWHT } from '@core/screen'
import { GALAXIES } from '@/game/galaxyConfig'
import fs from 'fs'
import path from 'path'

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: npm run validate-recording <recording-file.json|.bin>')
    process.exit(1)
  }

  // Load recording from file
  const filePath = args[0]
  if (!filePath) {
    console.error('Error: No file path provided')
    process.exit(1)
  }

  // Load and decode recording (auto-detect format: gzipped binary, binary, or JSON)
  const fileBuffer = fs.readFileSync(filePath)

  // Create a properly-sized ArrayBuffer (Node.js Buffer.buffer may be a pooled view)
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  )

  // Auto-detect format
  const recording = await decodeRecordingAuto(arrayBuffer)

  // Map galaxy ID to path
  const galaxyConfig = GALAXIES.find(g => g.id === recording.galaxyId)
  if (!galaxyConfig) {
    console.error(`Unknown galaxy ID: ${recording.galaxyId}`)
    console.error(`Available galaxies: ${GALAXIES.map(g => g.id).join(', ')}`)
    process.exit(1)
  }

  // Map web path to file system path
  // Web paths like "/release_galaxy.bin" -> "src/game/public/release_galaxy.bin"
  // Web paths like "/galaxies/continuum_galaxy.bin" -> "src/game/public/galaxies/continuum_galaxy.bin"
  const galaxyFilePath = path.join('src/game/public', galaxyConfig.path)

  // Sprite resource path (rsrc_260.bin contains all the sprite data)
  const spriteFilePath = path.join('src/game/public', 'rsrc_260.bin')

  // Create minimal services for headless validation (no fizz service needed)
  const galaxyService = createGalaxyServiceNode(galaxyFilePath)
  const randomService = createRandomService()
  const recordingService = createRecordingService()
  const collisionService = createCollisionService()
  collisionService.initialize({ width: SCRWTH, height: VIEWHT })
  const spriteService = createSpriteServiceNode(spriteFilePath)

  const services = {
    galaxyService,
    randomService,
    recordingService,
    collisionService,
    spriteService
  }

  // Create headless store (no UI, sound, or persistence)
  const store = createHeadlessStore(
    services,
    recording.initialState.lives,
    recording.startLevel
  )

  // Create headless engine (uses frame counter instead of real fizz service)
  const engine = createHeadlessGameEngine(
    store,
    galaxyService,
    randomService,
    recording.galaxyId,
    recording.initialState.lives
  )

  const validator = createRecordingValidator(engine, store, recordingService)

  console.log(`Validating: ${filePath}`)
  console.log(`Galaxy: ${recording.galaxyId}`)
  console.log(`Start level: ${recording.startLevel}`)
  console.log(
    `Total frames: ${recording.inputs[recording.inputs.length - 1]?.frame ?? 0}`
  )

  const report = validator.validate(recording)

  console.log(`\nResult: ${report.success ? 'PASS' : 'FAIL'}`)
  console.log(`Frames validated: ${report.framesValidated}`)
  console.log(`Snapshots checked: ${report.snapshotsChecked}`)

  if (report.divergenceFrame !== null) {
    console.log(`\nDivergence at frame: ${report.divergenceFrame}`)
    const error = report.errors[0]

    if (error?.stateDiff) {
      // Full state diff available - show detailed comparison
      console.log(`\nState differences (${error.stateDiff.length} slices):`)
      for (const diff of error.stateDiff) {
        console.log(`\n  ${diff.path}:`)

        // For planet slice, do a more detailed comparison
        if (
          diff.path === 'planet' &&
          typeof diff.expected === 'object' &&
          typeof diff.actual === 'object'
        ) {
          const expected = diff.expected as Record<string, unknown>
          const actual = diff.actual as Record<string, unknown>

          console.log('    Checking array lengths:')
          for (const key of Object.keys(expected)) {
            if (Array.isArray(expected[key])) {
              const expArray = expected[key] as unknown[]
              const actArray = actual[key] as unknown[] | undefined
              const match = expArray.length === (actArray?.length ?? -1)
              console.log(
                `      ${key}: ${expArray.length} vs ${actArray?.length ?? 'undefined'} ${match ? '✓' : '✗'}`
              )
            }
          }

          console.log('    Checking first elements:')
          const arrays = [
            'lines',
            'bunkers',
            'fuels',
            'craters',
            'gravityPoints'
          ]
          for (const arrName of arrays) {
            const expectedArr = expected[arrName] as unknown[] | undefined
            const actualArr = actual[arrName] as unknown[] | undefined
            if (expectedArr && actualArr && expectedArr.length > 0) {
              const exp0 = JSON.stringify(expectedArr[0])
              const act0 = JSON.stringify(actualArr[0])
              const match = exp0 === act0
              console.log(`      ${arrName}[0] match: ${match ? '✓' : '✗'}`)
              if (!match) {
                console.log(`        Expected: ${exp0.substring(0, 150)}`)
                console.log(`        Actual:   ${act0.substring(0, 150)}`)
              }
            }
          }

          // Check all elements for a mismatch
          console.log('    Searching for differences...')
          for (const arrName of arrays) {
            const expectedArr = expected[arrName] as unknown[] | undefined
            const actualArr = actual[arrName] as unknown[] | undefined
            if (expectedArr && actualArr) {
              for (
                let i = 0;
                i < Math.min(expectedArr.length, actualArr.length);
                i++
              ) {
                const exp = JSON.stringify(expectedArr[i])
                const act = JSON.stringify(actualArr[i])
                if (exp !== act) {
                  console.log(`      Found difference in ${arrName}[${i}]`)
                  console.log(`        Expected: ${exp.substring(0, 200)}`)
                  console.log(`        Actual:   ${act.substring(0, 200)}`)
                  break
                }
              }
            }
          }
        } else {
          console.log(
            `    Expected: ${JSON.stringify(diff.expected).substring(0, 200)}...`
          )
          console.log(
            `    Actual:   ${JSON.stringify(diff.actual).substring(0, 200)}...`
          )
        }
      }
    } else if (error?.expectedHash && error?.actualHash) {
      // Only hash available - show hash comparison
      console.log(`  Expected hash: ${error.expectedHash}`)
      console.log(`  Actual hash:   ${error.actualHash}`)
    }
  }

  process.exit(report.success ? 0 : 1)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
