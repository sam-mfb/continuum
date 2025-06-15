# continuum

## Overview

This project is an attempt to make a fairly exact copy of the 68000 Mac game Continuum for the web.

The idea is to not only make the game playable in a browser, but to use the original assets and the core original game play logic. The final should have the same look and feel as the original.

It is based on the original source code and related files released publicly by the original developers [here](https://www.ski-epic.com/continuum_downloads/).

All of the files are in the `orig` folder in this repository.

## Status

There is a wrapper React app that essentially shows/tests the various pieces that are working so far. To see it, clone the repo and run `npm install && npm run dev`

### 1. Plant Parser

- Unpacking and parsing the original planet file is working
- There is a basic map viewer in the React app, which lets you see that the planets match the original.
- TODO: The bunker gun positions isn't being interpreted correctly, so the guns currently point in the wrong directions

### 2. Bitmap Parser

- Parsing all the images that came with the original source code works except for the Title Page
- I think the title page is corrupted, but I was able to get the original by just copying it out of the orignal games resource fork
- TODO: We could get all the images from the game's resource fork rather than the Graphics folder in the original source. Not sure that matters.

### 3. Sound

- Recreated all the original game sounds from their original logic (they were all algorithmically generated)
- Extracted the original sine lookup table from the game's resource fork.
- TODO: Extract the pregenerated "hiss" random seeds from the game's resource fork (currently we just generate our own)

### 4. Gameplay

- Recreated basic physics and ship movement in a canvas based system
- TODO:
  - Shooting
  - Collision detection
  - Refueling
  - A lot of other things...

### 5. Drawing

- TODO:
  - Draw bitmap images in game
  - Draw procedurally generated images (flames)
  - Animations (explosions, fuel cells)

### 6. Meta

- TODO:
  - Scoring
  - Hi Scores
  - Other...

### 7. Planet Editor?
