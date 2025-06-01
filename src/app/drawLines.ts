type Line = {
  startx: number
  starty: number
  endx: number
  endy: number
  kind: number
}

export const drawLines = (ctx: CanvasRenderingContext2D, lines: Line[]): void => {
  ctx.save()
  ctx.lineWidth = 1
  for (const line of lines) {
    ctx.beginPath()
    let color
    switch (line.kind) {
      case 0: //normal
        color = 'white'
        break
      case 1: //bounce
        color = 'green'
        break
      case 2: //ghost
        color = 'gray'
        break
      case 3: //explode
        color = 'red'
        break
      default:
        color = 'white'
        break
    }
    ctx.strokeStyle = color
    ctx.moveTo(line.startx, line.starty)
    ctx.lineTo(line.endx, line.endy)
    ctx.stroke()
  }
  ctx.restore()
}
