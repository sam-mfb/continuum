// Death and respawn constants from GW.h
export const DEAD_TIME = 60 // Frames of death animation (GW.h:89)
export const SKILLBRADIUS = 30 // Radius for bunker death blast when ship dies (GW.h:90)
export const SCOREBUNK = 50 // Points for destroying bunker
export const FUELSTART = 10000 // Starting amount of fuel (GW.h:136)

// Shield-related constants from GW.h
export const FUELSHIELD = 83 // Fuel consumed per frame while shielding (GW.h:139)
export const SHRADIUS = 12 // Shield protection radius in pixels (GW.h:77)

// Fuel constants from GW.h
export const FUELGAIN = 2000 // Amount of fuel gained from cell (GW.h:140)
export const FRADIUS = 30 // Distance from fuel to pick it up (GW.h:138)

/* x-direction thrust provided in each direction (y, too, with some work) */
export const SHIP = {
  thrustx: [
    0, 9, 18, 27, 34, 40, 44, 47, 48, 47, 44, 40, 34, 27, 18, 9, 0, -9, -18,
    -27, -34, -40, -44, -47, -48, -47, -44, -40, -34, -27, -18, -9
  ],
  // Bounce vectors for wall bounce physics (Play.c:289-290)
  // Used with 16 directions (22.5 degrees each)
  bounce_vecs: [
    0, 18, 34, 44, 48, 44, 34, 18, 0, -18, -34, -44, -48, -44, -34, -18, 0
  ]
} as const
