const getPlanet = (planetsBuffer, planetIndex, planet) => {
  const planetByteSize = 1540
  const planetHeaderSize = 30
  const planetByteOffset = planetByteSize * planetIndex[planet - 1]
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
  let planetObj = {}

  planetObj.worldwidth = getInt16BE(planetDV, ip)
  planetObj.worldheight = getInt16BE(planetDV, (ip += incr))
  planetObj.worldwrap = getInt16BE(planetDV, (ip += incr))
  planetObj.shootslow = getInt16BE(planetDV, (ip += incr))
  planetObj.xstart = getInt16BE(planetDV, (ip += incr))
  planetObj.xstart %= planetObj.worldwidth //I don't know why; it's what the old code did...
  planetObj.ystart = getInt16BE(planetDV, (ip += incr))
  planetObj.planetbonus = getInt16BE(planetDV, (ip += incr))
  planetObj.gravx = getInt16BE(planetDV, (ip += incr))
  planetObj.gravy = getInt16BE(planetDV, (ip += incr))
  planetObj.numcraters = getInt16BE(planetDV, (ip += incr))

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
  planetObj.lines = []
  let garbage = false
  for (let i = 0; i < maxLines; i++) {
    let line = {
      startx: getInt16BE(planetDV, (ip += incr)),
      starty: getInt16BE(planetDV, (ip += incr)),
      length: getInt16BE(planetDV, (ip += incr))
    }
    //The next two bytes are packed as follows:  the top byte indicates if the line is
    //'up' (-1) or 'down' (1).  The bottom 3 bits of the lower byte indicate which of the
    //five directions in a quadrant (or angles, if you like) the line is pointing.  The
    //two bits above that indicate which 'kind' of line it is: (1) normal, (2) bounce,
    //(3) phantom, or (4) explode.  NB: I don't think the latter type was actually supported.
    let ud_and_t = getInt16BE(planetDV, (ip += incr))
    line.up_down = ud_and_t >> 8
    line.type = ud_and_t & 7
    line.kind = (ud_and_t & 31) >> 3
    //Continuum pre-calculated some things about lines, presumably for speed, including
    //using a very rough version of sine and cosine tables for the 5 angles at issue
    //(multiplied by two to give a little extra precision, i.e., an extra bit).
    const ylength = [0, 2, 2, 2, 1, 0]
    const xlength = [0, 0, 1, 2, 2, 2]
    line.endx = line.startx + ((xlength[line.type] * line.length) >> 1)
    line.endy =
      line.starty + line.up_down * ((ylength[line.type] * line.length) >> 1)
    //This appears to be making lines from these two angles always odd, but
    //I'm not sure why...
    const LINE_NNE = 2
    const LINE_ENE = 4
    if (line.type === LINE_NNE || line.type === LINE_ENE) line.length |= 1
    //newType consolidates up_down and type to give the following directions:
    //S, SSE, SE, ESE, E, ENE, NE, NNE
    line.newType = line.up_down === -1 ? 10 - line.type : line.type
    //Setting line.startx to 10000  was how Continuum indicated that a line
    //and _all subsequent lines in the buffer_ were invalid (it didn't
    //actually zero out the later lines).
    if (!line.type || line.endx > 4000 || line.starty > 4000)
      line.startx = 10000
    //Since every line past the first line where startx is 10000 is garbage
    //we'll ignore them.  You can get rid of this to see the random lines that
    //were there in the original Continuum files.
    garbage = line.startx === 10000 ? true : garbage
    if (!garbage) planetObj.lines.push(line)
  }

  planetObj.bunkers = []
  garbage = false
  let bunker
  for (let i = 0; i < maxBunkers; i++) {
    bunker = {
      x: getInt16BE(planetDV, (ip += incr)),
      y: getInt16BE(planetDV, (ip += incr)),
      rot: getInt16BE(planetDV, (ip += incr)),
      ranges: [{}, {}],
      alive: true
    }
    for (let j = 0; j < 2; j++) {
      bunker.ranges[j].low = getInt16BE(planetDV, (ip += incr))
      bunker.ranges[j].high = getInt16BE(planetDV, (ip += incr))
    }
    //A rotation ('rot') value of -1 means the bunker is 'kind' 0,
    //which doesn't have a rotation [or gets it from the wall?]  Otherwise,
    //the 'kind' of bunker is stored in the top byte and the rotation in the
    //bottom byte of the 'rot' 2 byte integer
    if (bunker.rot === -1) bunker.kind = 0
    else {
      bunker.kind = bunker.rot >> 8
      bunker.rot &= 255
    }
    //This is what's in the original code, but it can't be right or every
    //kind 0 would be ignored...
    //if (bunker.rot < 0 || bunker.x > 4000 || bunker.y > 4000) bunker.x = 10000
    if (bunker.x > 4000 || bunker.y > 4000) bunker.x = 10000

    garbage = bunker.x === 10000 ? true : garbage
    if (!garbage) planetObj.bunkers.push(bunker)
  }

  planetObj.fuels = []
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
    if (!garbage) planetObj.fuels.push(fuel)
  }
  //  planetObj.fuels[maxFuels - 1].x = 20000 //i don't know why this is here; was in the original code

  planetObj.craters = []

  let crater
  for (let i = 0; i < maxInitCraters; i++) {
    crater = {
      x: getInt16BE(planetDV, (ip += incr)),
      y: getInt16BE(planetDV, (ip += incr))
    }
    planetObj.craters.push(crater)
  }

  return planetObj
}
