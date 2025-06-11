#!/usr/bin/env node
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { continuumTitleToImageData } from './src/art/continuumTitlePict'

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read the file
const filePath = join(
  __dirname,
  'src/assets/graphics/continuum_title_page.pict'
)
const rawData = readFileSync(filePath)

// Mock ImageData for Node.js environment
class ImageData {
  constructor(
    public data: Uint8ClampedArray,
    public width: number,
    public height: number
  ) {}
}
;(global as any).ImageData = ImageData

// Process the image
const result = continuumTitleToImageData(rawData.buffer)

// Report results
console.log('\n=== Analysis Results ===')
console.log(`Total scanlines processed: ${result.packedScanlines.length}`)

// Find lines with missing border
const linesWithMissingBorder = result.packedScanlines.filter(
  line => line.missingBorder
)
console.log(`Scanlines without border: ${linesWithMissingBorder.length}`)

// ANSI color codes
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const RESET = '\x1b[0m'

// Helper function to format a line
function formatLine(line: (typeof result.packedScanlines)[0]): string {
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
    const minLine = Math.max(0, cluster[0] - 2)
    const maxLine = Math.min(
      result.packedScanlines.length - 1,
      cluster[cluster.length - 1] + 2
    )

    for (let i = minLine; i <= maxLine; i++) {
      const line = result.packedScanlines[i]
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
