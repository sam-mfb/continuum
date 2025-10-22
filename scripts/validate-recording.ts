import { createRecordingService } from '@/game/recording/RecordingService'
import { createHeadlessGameEngine } from '@/game/validation/HeadlessGameEngine'
import { createRecordingValidator } from '@/game/validation/RecordingValidator'
import { createHeadlessStore } from '@/game/validation/createHeadlessStore'
import { createGalaxyServiceNode } from '@/core/galaxy/createGalaxyServiceNode'
import { createFizzTransitionService } from '@/core/transition'
import { createRandomService } from '@/core/shared'
import { GALAXIES } from '@/game/galaxyConfig'
import fs from 'fs'
import path from 'path'

const main = async () => {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: npm run validate-recording <recording-file.json>')
    process.exit(1)
  }

  // Load recording from file
  const filePath = args[0]
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const recording = JSON.parse(fileContent)

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

  // Create minimal services for headless validation
  const galaxyService = createGalaxyServiceNode(galaxyFilePath)
  const fizzTransitionService = createFizzTransitionService()
  const randomService = createRandomService()
  const recordingService = createRecordingService()

  const services = {
    galaxyService,
    fizzTransitionService,
    randomService,
    recordingService
  }

  // Create headless store (no UI, sound, or persistence)
  const store = createHeadlessStore(
    services,
    recording.initialState.lives,
    recording.galaxyId
  )

  const engine = createHeadlessGameEngine(
    store,
    galaxyService,
    fizzTransitionService,
    randomService
  )

  const validator = createRecordingValidator(
    engine,
    store,
    recordingService,
    randomService
  )

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
        console.log(
          `    Expected: ${JSON.stringify(diff.expected).substring(0, 200)}...`
        )
        console.log(
          `    Actual:   ${JSON.stringify(diff.actual).substring(0, 200)}...`
        )
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
