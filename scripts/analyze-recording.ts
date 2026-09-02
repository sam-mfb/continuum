/**
 * @fileoverview Frame-by-frame diagnostic replay of a recording (headless).
 *
 * Unlike validate-recording, which only reports whether the replay diverges,
 * this steps the recorded inputs through the real game logic and reports what
 * the game state was doing on each frame. Use it to locate the frames where
 * something looks wrong in a replay.
 *
 * Usage:
 *   npm run analyze-recording -- <recording.bin>
 *   npm run analyze-recording -- <recording.bin> --from 1200 --to 1320
 *
 * With no range it prints a timeline of notable events (level loads, mission
 * complete, transition phase changes, ship deaths, respawns). With a range it
 * prints every frame in that range.
 */

import { createRecordingService } from '@core/recording'
import { decodeRecordingAuto } from '@core/recording/binaryCodec'
import { createHeadlessGameEngine, createHeadlessStore } from '@core/validation'
import { decompress } from './gzip.node'
import { createGalaxyServiceNode } from '@/core/galaxy/createGalaxyServiceNode'
import { createRandomService } from '@/core/shared'
import { createCollisionService } from '@core/collision'
import { createSpriteServiceNode } from '@core/sprites/createSpriteServiceNode'
import { SCRWTH, VIEWHT } from '@core/screen'
import { loadLevel } from '@core/game/levelThunks'
import type { GameRootState } from '@core/game/types'
import { GALAXIES } from '@/game/galaxyConfig'
import fs from 'fs'
import path from 'path'

type Options = {
  file: string
  from: number | null
  to: number | null
}

const parseArgs = (argv: string[]): Options => {
  const file = argv.find(a => !a.startsWith('--'))
  if (!file) {
    console.error(
      'Usage: npm run analyze-recording -- <recording.bin> [--from N] [--to N]'
    )
    process.exit(1)
  }
  const numFlag = (name: string): number | null => {
    const i = argv.indexOf(name)
    if (i === -1) return null
    const v = Number(argv[i + 1])
    return Number.isFinite(v) ? v : null
  }
  return { file, from: numFlag('--from'), to: numFlag('--to') }
}

const describe = (state: GameRootState): string => {
  const bunkersAlive = state.planet.bunkers.filter(
    b => b.rot >= 0 && b.alive
  ).length
  return [
    `level=${state.status.currentlevel}`,
    `trans=${state.transition.status}`,
    `preFizz=${state.transition.preFizzFrames}`,
    `starmap=${state.transition.starmapFrames}`,
    `bunkers=${bunkersAlive}`,
    `dead=${state.ship.deadCount}`,
    `flash=${state.explosions.shipDeathFlashFrames}`,
    `lives=${state.ship.lives}`,
    `fuel=${state.ship.fuel}`,
    `ship=(${state.ship.globalx},${state.ship.globaly})`,
    `screen=(${state.screen.screenx},${state.screen.screeny})`,
    `sparks=${state.explosions.sparksalive}`,
    `msg=${state.status.curmessage ?? '-'}`
  ].join(' ')
}

const main = async (): Promise<void> => {
  const opts = parseArgs(process.argv.slice(2))

  const fileBuffer = fs.readFileSync(opts.file)
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  )
  const recording = await decodeRecordingAuto(arrayBuffer, decompress)

  const galaxyConfig = GALAXIES.find(g => g.id === recording.galaxyId)
  if (!galaxyConfig) {
    console.error(`Unknown galaxy ID: ${recording.galaxyId}`)
    process.exit(1)
  }

  const galaxyService = createGalaxyServiceNode(
    path.join('src/game/public', galaxyConfig.path)
  )
  const randomService = createRandomService()
  const recordingService = createRecordingService()
  const collisionService = createCollisionService()
  collisionService.initialize({ width: SCRWTH, height: VIEWHT })
  const spriteService = createSpriteServiceNode(
    path.join('src/game/public', 'rsrc_260.bin')
  )

  const store = createHeadlessStore(
    {
      galaxyService,
      randomService,
      recordingService,
      collisionService,
      spriteService
    },
    recording.startLevel
  )
  const engine = createHeadlessGameEngine(
    store,
    galaxyService,
    randomService,
    recording.galaxyId
  )

  recordingService.startReplay(recording)

  const firstLevelSeed = recording.levelSeeds[0]
  if (!firstLevelSeed) {
    console.error('Recording has no level seeds')
    process.exit(1)
  }
  store.dispatch(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loadLevel(firstLevelSeed.level, firstLevelSeed.seed) as any
  )

  const totalFrames = recording.inputs[recording.inputs.length - 1]?.frame ?? 0
  console.log(`File: ${opts.file}`)
  console.log(
    `Galaxy: ${recording.galaxyId}  startLevel: ${recording.startLevel}`
  )
  console.log(`Frames: ${totalFrames}`)
  console.log(
    opts.from !== null || opts.to !== null
      ? `Range: ${opts.from ?? 0}..${opts.to ?? totalFrames}\n`
      : 'Event timeline (pass --from/--to for per-frame detail)\n'
  )

  const inRange = (f: number): boolean =>
    (opts.from === null && opts.to === null) ||
    (f >= (opts.from ?? 0) && f <= (opts.to ?? totalFrames))
  const detail = opts.from !== null || opts.to !== null

  let prev: GameRootState | null = null

  for (let f = 0; f <= totalFrames; f++) {
    const controls = recordingService.getReplayControls(f)
    if (controls === null) {
      console.log(`f=${f} MISSING INPUT`)
      continue
    }

    engine.step(f, controls)
    const state = store.getState()

    if (detail) {
      if (inRange(f))
        console.log(`f=${String(f).padStart(5)} ${describe(state)}`)
    } else if (prev) {
      const events: string[] = []
      const aliveNow = state.planet.bunkers.filter(
        b => b.rot >= 0 && b.alive
      ).length
      const alivePrev = prev.planet.bunkers.filter(
        b => b.rot >= 0 && b.alive
      ).length
      if (aliveNow < alivePrev)
        events.push(`bunker destroyed (${aliveNow} left)`)
      if (state.transition.status !== prev.transition.status)
        events.push(
          `transition ${prev.transition.status} -> ${state.transition.status}`
        )
      if (state.status.currentlevel !== prev.status.currentlevel)
        events.push(
          `level ${prev.status.currentlevel} -> ${state.status.currentlevel}`
        )
      if (state.ship.deadCount > 0 && prev.ship.deadCount === 0)
        events.push('ship died')
      if (state.ship.deadCount === 0 && prev.ship.deadCount > 0)
        events.push('ship respawned')
      if (state.status.curmessage !== prev.status.curmessage)
        events.push(`message: ${state.status.curmessage ?? '(cleared)'}`)
      if (state.ship.lives !== prev.ship.lives)
        events.push(`lives ${prev.ship.lives} -> ${state.ship.lives}`)
      for (const e of events) console.log(`f=${String(f).padStart(5)}  ${e}`)
    }

    prev = JSON.parse(JSON.stringify(store.getState())) as GameRootState
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
