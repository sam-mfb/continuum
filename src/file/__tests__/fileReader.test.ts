import { it, expect, describe, beforeAll, afterAll } from 'vitest'
import { readBinaryFile, readBinaryFileSync, readBinaryFileFromBlob } from '../fileReader'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('readBinaryFile', () => {
  let tempDir: string
  let testFilePath: string

  beforeAll(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fileReader-test-'))
    testFilePath = path.join(tempDir, 'test.bin')
  })

  afterAll(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('reads binary file content correctly', async () => {
    // Create test data
    const testData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]) // "Hello" in ASCII
    await fs.writeFile(testFilePath, testData)

    // Read the file
    const buffer = await readBinaryFile(testFilePath)
    const view = new Uint8Array(buffer)

    // Verify content
    expect(view.length).toBe(5)
    expect(Array.from(view)).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f])
  })

  it('reads empty file correctly', async () => {
    const emptyFilePath = path.join(tempDir, 'empty.bin')
    await fs.writeFile(emptyFilePath, new Uint8Array())

    const buffer = await readBinaryFile(emptyFilePath)
    expect(buffer.byteLength).toBe(0)
  })

  it('reads file with binary data including null bytes', async () => {
    const binaryData = new Uint8Array([0x00, 0xff, 0x12, 0x34, 0x00, 0xab, 0xcd])
    const binaryFilePath = path.join(tempDir, 'binary.bin')
    await fs.writeFile(binaryFilePath, binaryData)

    const buffer = await readBinaryFile(binaryFilePath)
    const view = new Uint8Array(buffer)

    expect(view.length).toBe(7)
    expect(Array.from(view)).toEqual([0x00, 0xff, 0x12, 0x34, 0x00, 0xab, 0xcd])
  })

  it('throws error for non-existent file', async () => {
    const nonExistentPath = path.join(tempDir, 'does-not-exist.bin')
    
    await expect(readBinaryFile(nonExistentPath)).rejects.toThrow(
      /Failed to read binary file.*ENOENT/
    )
  })

  it('preserves exact binary content for large files', async () => {
    // Create a larger test file with a pattern
    const size = 1024 * 10 // 10KB
    const largeData = new Uint8Array(size)
    for (let i = 0; i < size; i++) {
      largeData[i] = i % 256
    }
    
    const largeFilePath = path.join(tempDir, 'large.bin')
    await fs.writeFile(largeFilePath, largeData)

    const buffer = await readBinaryFile(largeFilePath)
    const view = new Uint8Array(buffer)

    expect(view.length).toBe(size)
    // Check a few samples
    expect(view[0]).toBe(0)
    expect(view[255]).toBe(255)
    expect(view[256]).toBe(0)
    expect(view[511]).toBe(255)
  })
})

describe('readBinaryFileSync', () => {
  let tempDir: string
  let testFilePath: string

  beforeAll(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fileReaderSync-test-'))
    testFilePath = path.join(tempDir, 'test.bin')
  })

  afterAll(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('reads binary file content correctly (sync)', () => {
    // Create test data
    const testData = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a])
    fsSync.writeFileSync(testFilePath, testData)

    // Read the file
    const buffer = readBinaryFileSync(testFilePath)
    const view = new Uint8Array(buffer)

    // Verify content
    expect(view.length).toBe(5)
    expect(Array.from(view)).toEqual([0x12, 0x34, 0x56, 0x78, 0x9a])
  })

  it('reads empty file correctly (sync)', () => {
    const emptyFilePath = path.join(tempDir, 'empty-sync.bin')
    fsSync.writeFileSync(emptyFilePath, new Uint8Array())

    const buffer = readBinaryFileSync(emptyFilePath)
    expect(buffer.byteLength).toBe(0)
  })

  it('throws error for non-existent file (sync)', () => {
    const nonExistentPath = path.join(tempDir, 'does-not-exist-sync.bin')
    
    expect(() => readBinaryFileSync(nonExistentPath)).toThrow(
      /Failed to read binary file.*ENOENT/
    )
  })

  it('returns same content as async version', async () => {
    const testData = new Uint8Array([0xde, 0xad, 0xbe, 0xef])
    const compareFilePath = path.join(tempDir, 'compare.bin')
    await fs.writeFile(compareFilePath, testData)

    const asyncBuffer = await readBinaryFile(compareFilePath)
    const syncBuffer = readBinaryFileSync(compareFilePath)

    const asyncView = new Uint8Array(asyncBuffer)
    const syncView = new Uint8Array(syncBuffer)

    expect(Array.from(asyncView)).toEqual(Array.from(syncView))
  })
})

describe('readBinaryFileFromBlob', () => {
  it('reads binary data from Blob', async () => {
    const testData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
    const arrayBuffer = testData.buffer.slice(
      testData.byteOffset,
      testData.byteOffset + testData.byteLength
    )
    
    // Create a blob with arrayBuffer method
    const blob = new Blob([testData])
    blob.arrayBuffer = async (): Promise<ArrayBuffer> => arrayBuffer

    const buffer = await readBinaryFileFromBlob(blob)
    const view = new Uint8Array(buffer)

    expect(view.length).toBe(5)
    expect(Array.from(view)).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f])
  })

  it('reads binary data from File using FileReader fallback', async () => {
    const testData = new Uint8Array([0x12, 0x34, 0x56, 0x78])
    const file = new File([testData], 'test.bin', { type: 'application/octet-stream' })
    
    // Don't add arrayBuffer method to trigger FileReader fallback
    // Mock FileReader for jsdom
    const originalFileReader = globalThis.FileReader
    globalThis.FileReader = class MockFileReader {
      onload: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      result: ArrayBuffer | null = null
      
      readAsArrayBuffer(_blob: Blob): void {
        // Convert blob to ArrayBuffer in a simple way for testing
        const reader = this
        setTimeout(() => {
          reader.result = testData.buffer.slice(
            testData.byteOffset,
            testData.byteOffset + testData.byteLength
          )
          if (reader.onload) {
            reader.onload({} as Event)
          }
        }, 0)
      }
    } as unknown as typeof FileReader

    try {
      const buffer = await readBinaryFileFromBlob(file)
      const view = new Uint8Array(buffer)

      expect(view.length).toBe(4)
      expect(Array.from(view)).toEqual([0x12, 0x34, 0x56, 0x78])
    } finally {
      globalThis.FileReader = originalFileReader
    }
  })

  it('handles empty Blob', async () => {
    const blob = new Blob([])
    const emptyBuffer = new ArrayBuffer(0)
    blob.arrayBuffer = async (): Promise<ArrayBuffer> => emptyBuffer
    
    const buffer = await readBinaryFileFromBlob(blob)
    expect(buffer.byteLength).toBe(0)
  })
})

