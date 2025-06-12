#!/usr/bin/env node
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { 
  parseScanlineData, 
  unpackScanlinesToBitmap, 
  checkMissingBorders 
} from './src/art/continuumTitlePict'

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read the file
const filePath = join(
  __dirname,
  'src/assets/graphics/continuum_title_page.pict'
)
const rawData = readFileSync(filePath)

// Image dimensions (same as in continuumTitlePict.ts)
const width = 504
const height = 311
const startOffset = 0x230

// Parse scanline data directly
const data = new Uint8Array(rawData.buffer)
const packedScanlines = parseScanlineData(data, startOffset, height)

// Unpack scanlines to bitmap
const bitmapData = unpackScanlinesToBitmap(packedScanlines, width, height)

// Check for missing borders and get updated scanlines
const scanlinesWithBorderInfo = checkMissingBorders(packedScanlines, bitmapData, width, 500)

// Report results
console.log('\n=== Analysis Results ===')
console.log(`Total scanlines processed: ${scanlinesWithBorderInfo.length}`)

// Find lines with missing border
const linesWithMissingBorder = scanlinesWithBorderInfo.filter(
  line => line.missingBorder
)
console.log(`Scanlines without border: ${linesWithMissingBorder.length}`)

// ANSI color codes
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const RESET = '\x1b[0m'

// Helper function to format a line
function formatLine(line: (typeof scanlinesWithBorderInfo)[0]): string {
  return `Line ${line.lineNumber}: prefix=${line.prefixBytes.length} bytes, compressed=${line.compressedBytes.length} bytes`
}

// Show packed data lengths for problematic lines with context
if (linesWithMissingBorder.length > 0) {
  console.log('\nProblematic lines with context:')

  // Group consecutive problematic lines into clusters
  const clusters: number[][] = []
  let currentCluster: number[] = []

  linesWithMissingBorder.forEach((line, index) => {
    if (currentCluster.length === 0) {
      currentCluster.push(line.lineNumber)
    } else {
      const lastLineNum = currentCluster[currentCluster.length - 1]
      if (line.lineNumber - lastLineNum <= 1) {
        // Consecutive or adjacent line
        currentCluster.push(line.lineNumber)
      } else {
        // Start new cluster
        clusters.push(currentCluster)
        currentCluster = [line.lineNumber]
      }
    }

    // Handle last cluster
    if (index === linesWithMissingBorder.length - 1) {
      clusters.push(currentCluster)
    }
  })

  // Display each cluster with context
  clusters.forEach(cluster => {
    const minLine = Math.max(0, cluster[0] - 3)
    const maxLine = Math.min(
      scanlinesWithBorderInfo.length - 1,
      cluster[cluster.length - 1] + 3
    )

    for (let i = minLine; i <= maxLine; i++) {
      const line = scanlinesWithBorderInfo[i]
      if (line) {
        if (cluster.includes(i)) {
          // Problematic line - print in red
          console.log(`  ${RED}${formatLine(line)}${RESET}`)
        } else {
          // Context line - print in green
          console.log(`  ${GREEN}${formatLine(line)}${RESET}`)
        }
      }
    }

    // Add space between clusters
    console.log()
  })
}
