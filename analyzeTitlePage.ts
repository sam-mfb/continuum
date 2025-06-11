#!/usr/bin/env node
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { continuumTitleToImageData } from './src/art/continuumTitlePict'

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read the file
const filePath = join(__dirname, 'src/assets/graphics/continuum_title_page.pict')
const rawData = readFileSync(filePath)

// Mock ImageData for Node.js environment
class ImageData {
  constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
}
;(global as any).ImageData = ImageData

// Process the image
const result = continuumTitleToImageData(rawData.buffer)

// Report results
console.log('\n=== Analysis Results ===')
console.log(`Total scanlines processed: ${result.packedScanlines.length}`)
console.log(`Scanlines without border: ${result.badLines.length}`)

// Show packed data lengths for problematic lines
if (result.badLines.length > 0) {
  console.log('\nProblematic lines (line number, prefix length, compressed length):')
  result.badLines.forEach(([lineNumber, [prefixBytes, compressedBytes]]) => {
    console.log(`  Line ${lineNumber}: prefix=${prefixBytes.length} bytes, compressed=${compressedBytes.length} bytes`)
  })
}