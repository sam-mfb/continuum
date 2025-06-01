// Planet file parsing implementation based on original Continuum Mac source code
// Primary reference: `unpack_planet()` function at Main.c:749-818
// Data structures from: GW.h (linerec, bunkrec, fuelrec, craterrec definitions)
// Lookup tables from: Play.c:46-47 (xlength, ylength arrays)
// Constants from: GW.h (PLANSIZE=1540, PLANHEAD=30, NUMLINES=125, etc.)

const getInt16BE = (dv: DataView, i: number): number => dv.getInt16(i, false)

type Planet = {
  worldwidth: number
  worldheight: number
  worldwrap: number
  shootslow: number
  xstart: number
  ystart: number
  planetbonus: number
  gravx: number
  gravy: number
  numcraters: number
  lines: {
    startx: number
    endx: number
    starty: number
    endy: number
    length: number
    up_down: number
    type: number
    kind: number
    newType: number
  }[]
  bunkers: {
    x: number
    y: number
    rot: number
    ranges: { low: number; high: number }[]
    alive: boolean
    kind: number
  }[]
  fuels: {
    x: number
    y: number
    alive: boolean
    currentfig: number
    figcount: number
  }[]
  craters: { x: number; y: number }[]
}

export function parsePlanet(
  planetsBuffer: ArrayBuffer,
  planetIndex: Uint8Array,
  planet: number
): Planet {
  const planetByteSize = 1540
  const planetHeaderSize = 30
  const planetLocation = planetIndex[planet - 1]
  if (!planetLocation) {
    throw new Error('No planet location noted in index')
  }
  const planetByteOffset = planetByteSize * planetLocation
  const planetByteEnd = planetByteOffset + planetByteSize
  const planetDV = new DataView(
    planetsBuffer.slice(planetByteOffset, planetByteEnd)
  )
  //This does basically the same thing the Continuum code did to "unpack"
  //a planet--start with a pointer 'ip' and walk it down the stream of bits
  //one long int (which was 2 bytes) at a time, occassionaly using bitwise
  //operators when information was stored in single bytes or flags.
  //Here 'ip' is our pointer and 'incr' reflects that by default we will pull
  //2 bytes at a time
  //NB: this would have been easier to do with a Int16 array but we can't because
  //the file is big-endian and most machines today are not...
  let ip = 0
  let incr = 2

  const worldwidth = getInt16BE(planetDV, ip)
  const worldheight = getInt16BE(planetDV, (ip += incr))
  const worldwrap = getInt16BE(planetDV, (ip += incr))
  const shootslow = getInt16BE(planetDV, (ip += incr))
  let xstart = getInt16BE(planetDV, (ip += incr))
  xstart %= worldwidth // Ensures starting X position wraps around if it exceeds world width
                       // Original C code: xstart = *ip++ % worldwidth;
  const ystart = getInt16BE(planetDV, (ip += incr))
  const planetbonus = getInt16BE(planetDV, (ip += incr))
  const gravx = getInt16BE(planetDV, (ip += incr))
  const gravy = getInt16BE(planetDV, (ip += incr))
  const numcraters = getInt16BE(planetDV, (ip += incr))

  ip = planetHeaderSize - incr //start 2 bytes lower to avoid a kludge in the for loop start

  //A Continuum planet is composed of walls (called 'lines'), bunkers, fuel cells, and
  //craters.  The constants below are important because the filesize was hardcoded to allow
  //these many per planet.
  const maxLines = 125
  const maxBunkers = 25
  const maxFuels = 15
  const maxInitCraters = 25 //bunkers turn into craters when shot so eventually there could be 50

  //All lines in Continuum are defined as left to right lines in the northeast
  //quadrant of a cartesian graph.  They can go out at one of five angles, designated
  //with the 'type' of N, NNE, NE, ENE, and E.  The actual line, however, can be drawn
  //'up' (i.e., in the northeast quadrant) or 'down" (i.e., in the southeast quadrant).
  //In the latter case, the lines are really going (S, SSE, SE, etc.).  Whether a line is
  //'up' or 'down' is represented by 'up_down', which is -1 for up and 1 for down.
  type Line = {
    startx: number
    endx: number
    starty: number
    endy: number
    length: number
    up_down: number
    type: number
    kind: number
    newType: number
  }
  const lines: Line[] = []
  let garbage = false
  for (let i = 0; i < maxLines; i++) {
    let startx = getInt16BE(planetDV, (ip += incr))
    const starty = getInt16BE(planetDV, (ip += incr))
    let length = getInt16BE(planetDV, (ip += incr))
    //The next two bytes are packed as follows:  the top byte indicates if the line is
    //'up' (-1) or 'down' (1).  The bottom 3 bits of the lower byte indicate which of the
    //five directions in a quadrant (or angles, if you like) the line is pointing.  The
    //two bits above that indicate which 'kind' of line it is: (1) normal, (2) bounce,
    //(3) phantom, or (4) explode.  NB: I don't think the latter type was actually supported.
    let ud_and_t = getInt16BE(planetDV, (ip += incr))
    const up_down = ud_and_t >> 8
    const type = ud_and_t & 7
    const kind = (ud_and_t & 31) >> 3
    //Continuum pre-calculated some things about lines, presumably for speed, including
    //using a very rough version of sine and cosine tables for the 5 angles at issue
    //(multiplied by two to give a little extra precision, i.e., an extra bit).
    const ylength = [0, 2, 2, 2, 1, 0]
    const xlength = [0, 0, 1, 2, 2, 2]
    const endx = startx + ((xlength[type]! * length) >> 1)
    const endy = starty + up_down * ((ylength[type]! * length) >> 1)
    // Force NNE and ENE lines to have odd lengths for proper endpoint calculation
    // This matches the original C code: if (line->type == LINE_NNE || line->type == LINE_ENE) line->length |= 1;
    // The |= 1 operation sets the least significant bit, making the number odd
    const LINE_NNE = 2
    const LINE_ENE = 4
    if (type === LINE_NNE || type === LINE_ENE) length |= 1
    //newType consolidates up_down and type to give the following directions:
    //S, SSE, SE, ESE, E, ENE, NE, NNE
    const newType = up_down === -1 ? 10 - type : type
    //Setting line.startx to 10000  was how Continuum indicated that a line
    //and _all subsequent lines in the buffer_ were invalid (it didn't
    //actually zero out the later lines).
    if (!type || endx > 4000 || starty > 4000) startx = 10000
    //Since every line past the first line where startx is 10000 is garbage
    //we'll ignore them.  You can get rid of this to see the random lines that
    //were there in the original Continuum files.
    garbage = startx === 10000 ? true : garbage
    if (!garbage)
      lines.push({
        startx,
        starty,
        length,
        up_down,
        type,
        kind,
        endx,
        endy,
        newType
      })
  }

  type Bunker = {
    x: number
    y: number
    rot: number
    ranges: { low: number; high: number }[]
    alive: boolean
    kind: number
  }

  const bunkers: Bunker[] = []
  garbage = false
  for (let i = 0; i < maxBunkers; i++) {
    let x = getInt16BE(planetDV, (ip += incr))
    const y = getInt16BE(planetDV, (ip += incr))
    let rot = getInt16BE(planetDV, (ip += incr))
    const alive = true
    const ranges: Bunker['ranges'][number][] = []
    for (let j = 0; j < 2; j++) {
      ranges.push({
        low: getInt16BE(planetDV, (ip += incr)),
        high: getInt16BE(planetDV, (ip += incr))
      })
    }
    //A rotation ('rot') value of -1 means the bunker is 'kind' 0,
    //which doesn't have a rotation [or gets it from the wall?]  Otherwise,
    //the 'kind' of bunker is stored in the top byte and the rotation in the
    //bottom byte of the 'rot' 2 byte integer
    let kind = 0
    if (rot === -1) kind = 0
    else {
      kind = rot >> 8
      rot &= 255
    }
    // Original C code checks: if (bunk->rot < 0 || bunk->x > 4000 || bunk->y > 4000) bunk->x = 10000
    // However, this would incorrectly invalidate all kind 0 bunkers (which have rot == -1)
    // since kind 0 bunkers are valid. The coordinate-only check below is more correct.
    if (x > 4000 || y > 4000) x = 10000

    garbage = x === 10000 ? true : garbage
    if (!garbage)
      bunkers.push({
        x,
        y,
        rot,
        alive,
        ranges,
        kind
      })
  }

  type Fuel = {
    x: number
    y: number
    alive: boolean
    currentfig: number
    figcount: number
  }

  const fuels: Fuel[] = []
  garbage = false

  let fuel
  for (let i = 0; i < maxFuels; i++) {
    fuel = {
      x: getInt16BE(planetDV, (ip += incr)),
      y: getInt16BE(planetDV, (ip += incr)),
      alive: true,
      currentfig: 1, //these two are for animation
      figcount: 1
    }
    if (fuel.x > 4000 || fuel.y > 4000) fuel.x = 10000

    garbage = fuel.x === 10000 ? true : garbage
    if (!garbage) fuels.push(fuel)
  }
  // Mark the last fuel cell as invalid/unused (matches original C code: fuels[NUMFUELS-1].x = 20000)
  // This ensures the final fuel cell slot is marked as unavailable for gameplay
  if (fuels.length > 0) {
    fuels[maxFuels - 1] = { x: 20000, y: 0, alive: false, currentfig: 1, figcount: 1 }
  }

  type Crater = {
    x: number
    y: number
  }

  const craters: Crater[] = []

  let crater
  for (let i = 0; i < maxInitCraters; i++) {
    crater = {
      x: getInt16BE(planetDV, (ip += incr)),
      y: getInt16BE(planetDV, (ip += incr))
    }
    craters.push(crater)
  }

  return {
    worldwidth,
    worldheight,
    worldwrap,
    shootslow,
    xstart,
    ystart,
    planetbonus,
    gravx,
    gravy,
    numcraters,
    lines,
    bunkers,
    fuels,
    craters
  }
}
