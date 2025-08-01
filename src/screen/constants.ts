// Screen dimensions from orig/Sources/GW.h
export const SCRWTH = 512 // Screen width
export const SCRHT = 342 // Screen height
export const SBARHT = 24 // Status bar height
export const VIEWHT = SCRHT - SBARHT // 318 - Viewable game area height
export const SOFTBORDER = 200

// Ship containment margins
export const LEFTMARG = 170 // Left margin for ship movement
export const RIGHTMARG = 341 // Right margin for ship movement
export const TOPMARG = 106 // Top margin for ship movement
export const BOTMARG = 211 // Bottom margin for ship movement

// Ship dimensions for edge constraints
export const SHIPHT = 16 // Ship height for boundary calculations

// Background patterns from orig/Sources/Play.c:61-62
export const BACKGROUND_PATTERNS = [0xaaaaaaaa, 0x55555555] as const
