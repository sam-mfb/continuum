// Type definitions for the galaxy viewer components
// These wrap the parser types to provide the interface needed by our UI

export type Planet = {
  worldwidth: number;
  worldheight: number;
  worldwrap: number;
  shootslow: number;
  xstart: number;
  ystart: number;
  planetbonus: number;
  gravx: number;
  gravy: number;
  numcraters: number;
  lines: {
    startx: number;
    endx: number;
    starty: number;
    endy: number;
    length: number;
    up_down: number;
    type: number;
    kind: number;
    newType: number;
  }[];
  bunkers: {
    x: number;
    y: number;
    rot: number;
    ranges: { low: number; high: number }[];
    alive: boolean;
    kind: number;
  }[];
  fuels: {
    x: number;
    y: number;
    alive: boolean;
    currentfig: number;
    figcount: number;
  }[];
  craters: { x: number; y: number }[];
}