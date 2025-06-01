import { readBinaryFileSync } from './fileReader'
import { splitGalaxyBuffer, parseGalaxyHeader } from './galaxy'
import { parsePlanet } from './planet'

// Read the file
const buffer = readBinaryFileSync('./src/assets/release_galaxy.bin')

// Split and parse
const { header, planets } = splitGalaxyBuffer(buffer)
const galaxyHeader = parseGalaxyHeader(header)

console.log(galaxyHeader)

for (let i = 1; i <= galaxyHeader.planets; i++) {
  const planet = parsePlanet(planets, galaxyHeader.indexes, i)

  console.log(JSON.stringify(planet.worldwidth))
}
