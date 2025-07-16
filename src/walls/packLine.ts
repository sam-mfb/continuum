import type { LineRec } from '../shared/types/line'

/**
 * Packed line format that matches what's stored in planet files
 * Based on pack_planet() in Edit.c
 */
export interface PackedLine {
  startx: number
  starty: number
  length: number
  type: number
  up_down: number
  kind: number
}

/**
 * Packs a complete line record into the minimal format used for saving to planet files.
 * This strips out calculated fields (endx, endy, newtype) and keeps only the essential data.
 * 
 * Based on pack_planet() from Edit.c:
 * ```c
 * for (line=lines; line < lines+NUMLINES; line++)
 * {   *ip++ = line->startx;
 *     *ip++ = line->starty;
 *     *ip++ = line->length;
 *     *ip++ = ((int) line->up_down << 8) + (line->kind << 3) + line->type;
 * }
 * ```
 * 
 * @param line Complete line record with all fields
 * @returns Packed line with only essential fields for storage
 */
export function packLine(line: LineRec): PackedLine {
  return {
    startx: line.startx,
    starty: line.starty,
    length: line.length,
    type: line.type,
    up_down: line.up_down,
    kind: line.kind
  }
}

/**
 * Packs multiple lines at once
 * 
 * @param lines Array of complete line records
 * @returns Array of packed lines
 */
export function packLines(lines: LineRec[]): PackedLine[] {
  return lines.map(packLine)
}