// See GW.h and Main.c:read_header()

export const GALAXY = {
  /* size of galaxy file header (FILEHEAD in GW.h) */
  HEADER_BYTES: 160,
  /* Magic number used by original Mac code for validation */
  FILE_IDENTIFIER: -17,
  /* Offset to start of ordered list of planet locations */
  PLANET_INDEX_OFFSET: 10
} as const
