/**
 * Binary codec for game recordings
 *
 * Provides efficient binary encoding/decoding of recordings with ~96% size reduction
 * compared to JSON format (binary + gzip).
 *
 * Format structure:
 * - Optional gzip compression (detected by 1f 8b magic bytes)
 * - Header: Magic number, version, section offsets/counts
 * - Inputs: Varint frame numbers + bitpacked controls
 * - Snapshots: Varint frame numbers + hash strings
 * - Level seeds: uint16 level + uint32 seed
 * - Metadata: JSON blob with remaining data
 */

import type {
  GameRecording,
  InputFrame,
  StateSnapshot,
  LevelSeed,
  ControlMatrix
} from './types'

const MAGIC = new TextEncoder().encode('CNREC') // 5 bytes
const FORMAT_VERSION = 1

// Flags for header
const FLAG_HAS_FINAL_STATE = 1 << 0
const FLAG_HAS_FULL_SNAPSHOTS = 1 << 1

/**
 * Check if buffer is gzipped (starts with 1f 8b)
 */
const isGzipped = (buffer: ArrayBuffer): boolean => {
  const bytes = new Uint8Array(buffer)
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
}

/**
 * Compress data with gzip
 * Works in both browser (CompressionStream) and Node.js (zlib)
 */
const gzipCompress = async (data: ArrayBuffer): Promise<ArrayBuffer> => {
  // Browser environment
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([data])
      .stream()
      .pipeThrough(new CompressionStream('gzip'))
    const compressed = await new Response(stream).arrayBuffer()
    return compressed
  }

  // Node.js environment
  if (typeof require !== 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const zlib = require('zlib') as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { promisify } = require('util') as any
      const gzip = promisify(zlib.gzip)
      const buffer = Buffer.from(data)
      const compressed = await gzip(buffer)
      return compressed.buffer.slice(
        compressed.byteOffset,
        compressed.byteOffset + compressed.byteLength
      )
    } catch {
      throw new Error('Gzip compression not available')
    }
  }

  throw new Error('Gzip compression not available in this environment')
}

/**
 * Decompress gzipped data
 * Works in both browser (DecompressionStream) and Node.js (zlib)
 */
const gzipDecompress = async (data: ArrayBuffer): Promise<ArrayBuffer> => {
  // Browser environment
  if (typeof DecompressionStream !== 'undefined') {
    const stream = new Blob([data])
      .stream()
      .pipeThrough(new DecompressionStream('gzip'))
    const decompressed = await new Response(stream).arrayBuffer()
    return decompressed
  }

  // Node.js environment
  if (typeof require !== 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const zlib = require('zlib') as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { promisify } = require('util') as any
      const gunzip = promisify(zlib.gunzip)
      const buffer = Buffer.from(data)
      const decompressed = await gunzip(buffer)
      return decompressed.buffer.slice(
        decompressed.byteOffset,
        decompressed.byteOffset + decompressed.byteLength
      )
    } catch {
      throw new Error('Gzip decompression not available')
    }
  }

  throw new Error('Gzip decompression not available in this environment')
}

/**
 * Encode a variable-length integer (varint)
 * Uses 7 bits per byte, MSB indicates continuation
 */
const encodeVarint = (value: number): number[] => {
  const bytes: number[] = []
  let num = value

  while (num >= 0x80) {
    bytes.push((num & 0x7f) | 0x80)
    num >>>= 7
  }
  bytes.push(num & 0x7f)

  return bytes
}

/**
 * Decode a variable-length integer from buffer at offset
 * Returns [value, bytesRead]
 */
const decodeVarint = (buffer: Uint8Array, offset: number): [number, number] => {
  let value = 0
  let shift = 0
  let bytesRead = 0

  while (offset + bytesRead < buffer.length) {
    const byte = buffer[offset + bytesRead]
    if (byte === undefined) break

    bytesRead++
    value |= (byte & 0x7f) << shift

    if ((byte & 0x80) === 0) {
      break
    }

    shift += 7
  }

  return [value, bytesRead]
}

/**
 * Pack 11 boolean control flags into 2 bytes (16 bits)
 * Order: thrust, left, right, fire, shield, selfDestruct, pause, quit, nextLevel, extraLife, map
 */
const packControls = (controls: ControlMatrix): number => {
  let bits = 0

  if (controls.thrust) bits |= 1 << 0
  if (controls.left) bits |= 1 << 1
  if (controls.right) bits |= 1 << 2
  if (controls.fire) bits |= 1 << 3
  if (controls.shield) bits |= 1 << 4
  if (controls.selfDestruct) bits |= 1 << 5
  if (controls.pause) bits |= 1 << 6
  if (controls.quit) bits |= 1 << 7
  if (controls.nextLevel) bits |= 1 << 8
  if (controls.extraLife) bits |= 1 << 9
  if (controls.map) bits |= 1 << 10

  return bits
}

/**
 * Unpack 2 bytes into 11 boolean control flags
 */
const unpackControls = (bits: number): ControlMatrix => {
  return {
    thrust: (bits & (1 << 0)) !== 0,
    left: (bits & (1 << 1)) !== 0,
    right: (bits & (1 << 2)) !== 0,
    fire: (bits & (1 << 3)) !== 0,
    shield: (bits & (1 << 4)) !== 0,
    selfDestruct: (bits & (1 << 5)) !== 0,
    pause: (bits & (1 << 6)) !== 0,
    quit: (bits & (1 << 7)) !== 0,
    nextLevel: (bits & (1 << 8)) !== 0,
    extraLife: (bits & (1 << 9)) !== 0,
    map: (bits & (1 << 10)) !== 0
  }
}

/**
 * Encode inputs section
 */
const encodeInputs = (inputs: InputFrame[]): Uint8Array => {
  const bytes: number[] = []

  for (const input of inputs) {
    // Frame number as varint
    bytes.push(...encodeVarint(input.frame))

    // Controls as 2 bytes
    const controlBits = packControls(input.controls)
    bytes.push(controlBits & 0xff, (controlBits >> 8) & 0xff)
  }

  return new Uint8Array(bytes)
}

/**
 * Decode inputs section
 */
const decodeInputs = (
  buffer: Uint8Array,
  offset: number,
  count: number
): InputFrame[] => {
  const inputs: InputFrame[] = []
  let pos = offset

  for (let i = 0; i < count; i++) {
    // Read frame number
    const [frame, varintBytes] = decodeVarint(buffer, pos)
    pos += varintBytes

    // Read controls (2 bytes)
    const controlBits = buffer[pos]! | (buffer[pos + 1]! << 8)
    pos += 2

    inputs.push({
      frame,
      controls: unpackControls(controlBits)
    })
  }

  return inputs
}

/**
 * Encode snapshots section
 */
const encodeSnapshots = (snapshots: StateSnapshot[]): Uint8Array => {
  const bytes: number[] = []

  for (const snapshot of snapshots) {
    // Frame number as varint
    bytes.push(...encodeVarint(snapshot.frame))

    // Hash as length-prefixed string
    const hashBytes = new TextEncoder().encode(snapshot.hash)
    bytes.push(hashBytes.length)
    bytes.push(...hashBytes)
  }

  return new Uint8Array(bytes)
}

/**
 * Decode snapshots section
 */
const decodeSnapshots = (
  buffer: Uint8Array,
  offset: number,
  count: number
): StateSnapshot[] => {
  const snapshots: StateSnapshot[] = []
  let pos = offset

  for (let i = 0; i < count; i++) {
    // Read frame number
    const [frame, varintBytes] = decodeVarint(buffer, pos)
    pos += varintBytes

    // Read hash (length-prefixed string)
    const hashLength = buffer[pos]!
    pos++

    const hashBytes = buffer.slice(pos, pos + hashLength)
    const hash = new TextDecoder().decode(hashBytes)
    pos += hashLength

    snapshots.push({ frame, hash })
  }

  return snapshots
}

/**
 * Encode level seeds section
 */
const encodeLevelSeeds = (seeds: LevelSeed[]): Uint8Array => {
  const bytes = new Uint8Array(seeds.length * 6)
  const view = new DataView(bytes.buffer)

  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i]!
    view.setUint16(i * 6, seed.level, true) // little-endian
    view.setUint32(i * 6 + 2, seed.seed, true)
  }

  return bytes
}

/**
 * Decode level seeds section
 */
const decodeLevelSeeds = (
  buffer: Uint8Array,
  offset: number,
  count: number
): LevelSeed[] => {
  const seeds: LevelSeed[] = []
  const view = new DataView(buffer.buffer, buffer.byteOffset + offset)

  for (let i = 0; i < count; i++) {
    const level = view.getUint16(i * 6, true)
    const seed = view.getUint32(i * 6 + 2, true)
    seeds.push({ level, seed })
  }

  return seeds
}

/**
 * Encode a game recording to binary format
 */
export const encodeRecording = (recording: GameRecording): ArrayBuffer => {
  // Encode each section
  const inputsData = encodeInputs(recording.inputs)
  const snapshotsData = encodeSnapshots(recording.snapshots)
  const levelSeedsData = encodeLevelSeeds(recording.levelSeeds)

  // Create metadata JSON (everything that doesn't go in binary sections)
  const metadata = {
    version: recording.version,
    engineVersion: recording.engineVersion,
    galaxyId: recording.galaxyId,
    startLevel: recording.startLevel,
    timestamp: recording.timestamp,
    initialState: recording.initialState,
    finalState: recording.finalState,
    fullSnapshots: recording.fullSnapshots
  }
  const metadataJson = JSON.stringify(metadata)
  const metadataData = new TextEncoder().encode(metadataJson)

  // Calculate header
  const HEADER_SIZE = 42
  const inputsOffset = HEADER_SIZE
  const snapshotsOffset = inputsOffset + inputsData.length
  const levelSeedsOffset = snapshotsOffset + snapshotsData.length
  const metadataOffset = levelSeedsOffset + levelSeedsData.length
  const totalSize = metadataOffset + metadataData.length

  // Create buffer
  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // Write header
  let pos = 0

  // Magic number (5 bytes)
  bytes.set(MAGIC, pos)
  pos += 5

  // Format version (1 byte)
  view.setUint8(pos, FORMAT_VERSION)
  pos++

  // Section offsets (4 × uint32 = 16 bytes)
  view.setUint32(pos, inputsOffset, true)
  pos += 4
  view.setUint32(pos, snapshotsOffset, true)
  pos += 4
  view.setUint32(pos, levelSeedsOffset, true)
  pos += 4
  view.setUint32(pos, metadataOffset, true)
  pos += 4

  // Section counts (4 × uint16 = 8 bytes)
  view.setUint16(pos, recording.inputs.length, true)
  pos += 2
  view.setUint16(pos, recording.snapshots.length, true)
  pos += 2
  view.setUint16(pos, recording.levelSeeds.length, true)
  pos += 2
  view.setUint16(pos, recording.fullSnapshots?.length ?? 0, true)
  pos += 2

  // Flags (1 byte)
  let flags = 0
  if (recording.finalState) flags |= FLAG_HAS_FINAL_STATE
  if (recording.fullSnapshots) flags |= FLAG_HAS_FULL_SNAPSHOTS
  view.setUint8(pos, flags)
  pos++

  // Reserved (11 bytes)
  pos += 11

  // Write sections
  bytes.set(inputsData, inputsOffset)
  bytes.set(snapshotsData, snapshotsOffset)
  bytes.set(levelSeedsData, levelSeedsOffset)
  bytes.set(metadataData, metadataOffset)

  return buffer
}

/**
 * Decode a game recording from binary format
 */
export const decodeRecording = (buffer: ArrayBuffer): GameRecording => {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // Read and verify header
  let pos = 0

  // Check magic number
  const magic = bytes.slice(pos, pos + 5)
  const magicStr = new TextDecoder().decode(magic)
  if (magicStr !== 'CNREC') {
    throw new Error('Invalid recording format: magic number mismatch')
  }
  pos += 5

  // Check format version
  const version = view.getUint8(pos)
  pos++

  if (version !== FORMAT_VERSION) {
    throw new Error(`Unsupported recording format version: ${version}`)
  }

  // Read section offsets
  const inputsOffset = view.getUint32(pos, true)
  pos += 4
  const snapshotsOffset = view.getUint32(pos, true)
  pos += 4
  const levelSeedsOffset = view.getUint32(pos, true)
  pos += 4
  const metadataOffset = view.getUint32(pos, true)
  pos += 4

  // Read section counts
  const inputsCount = view.getUint16(pos, true)
  pos += 2
  const snapshotsCount = view.getUint16(pos, true)
  pos += 2
  const levelSeedsCount = view.getUint16(pos, true)
  pos += 2
  // fullSnapshotsCount not used - fullSnapshots stored in metadata JSON
  pos += 2

  // flags not used - presence of fields checked via metadata
  pos++

  // Skip reserved bytes
  pos += 11

  // Decode sections
  const inputs = decodeInputs(bytes, inputsOffset, inputsCount)
  const snapshots = decodeSnapshots(bytes, snapshotsOffset, snapshotsCount)
  const levelSeeds = decodeLevelSeeds(bytes, levelSeedsOffset, levelSeedsCount)

  // Decode metadata JSON
  const metadataBytes = bytes.slice(metadataOffset)
  const metadataJson = new TextDecoder().decode(metadataBytes)
  const metadata = JSON.parse(metadataJson) as {
    version: string
    engineVersion: number
    galaxyId: string
    startLevel: number
    timestamp: number
    initialState: { lives: number }
    finalState?: { score: number; fuel: number; level: number }
    fullSnapshots?: unknown[]
  }

  // Reconstruct recording
  const recording: GameRecording = {
    version: metadata.version,
    engineVersion: metadata.engineVersion,
    galaxyId: metadata.galaxyId,
    startLevel: metadata.startLevel,
    timestamp: metadata.timestamp,
    initialState: metadata.initialState,
    inputs,
    snapshots,
    levelSeeds,
    finalState: metadata.finalState,
    fullSnapshots: metadata.fullSnapshots as GameRecording['fullSnapshots']
  }

  return recording
}

/**
 * Encode a game recording to binary format with gzip compression
 */
export const encodeRecordingGzip = async (
  recording: GameRecording
): Promise<ArrayBuffer> => {
  const binary = encodeRecording(recording)
  const compressed = await gzipCompress(binary)
  return compressed
}

/**
 * Decode a game recording with automatic format detection
 * Supports: gzipped binary, uncompressed binary, and JSON
 */
export const decodeRecordingAuto = async (
  buffer: ArrayBuffer
): Promise<GameRecording> => {
  // Check if gzipped
  if (isGzipped(buffer)) {
    const decompressed = await gzipDecompress(buffer)
    return decodeRecording(decompressed)
  }

  // Check if binary (CNREC magic)
  const bytes = new Uint8Array(buffer)
  const magic = new TextDecoder().decode(bytes.slice(0, 5))
  if (magic === 'CNREC') {
    return decodeRecording(buffer)
  }

  // Assume JSON
  const text = new TextDecoder().decode(buffer)
  return JSON.parse(text) as GameRecording
}
