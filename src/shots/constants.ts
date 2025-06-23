export const SHOT = {
  shotvecs: [
    0, 14, 27, 40, 51, 60, 67, 71, 72, 71, 67, 60, 51, 40, 27, 14, 0, -14, -27,
    -40, -51, -60, -67, -71, -72, -71, -67, -60, -51, -40, -27, -14
  ],
  NUMBULLETS: 6 /* number of ship's shots at once	*/,
  NUMSHOTS: 20 /* number of bunker shots at once	*/,
  SHOTLEN: 35 /* cycles bullets keep going		*/,
  BUNKSHLEN: 30 /* cycles bunk shots keep going	*/
} as const
