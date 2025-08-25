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
- This now shows actual game view as well

### 2. Bitmap Parser

- Parsing all the images that came with the original source code works except for the Title Page
- I think the title page is corrupted, but I was able to get the original by just copying it out of the orignal games resource fork
- Sprites and status bar are now based on the resources in the actual game's resource fork (thank you Resourcer)

### 3. Sound

- Recreated all the original game sounds from their original logic (they were all algorithmically generated)
- Use a ring buffer to play accurately in the browser
- Extracted the original sine lookup table from the game's resource fork.
- TODO:
  - Make this an easily callable service

### 4. Gameplay

- Recreated basic physics and ship movement in a canvas based system
- Ship bullet firing working
- Ship wall collision detection working
- Bunker bullet firing and tracking
- Ship bullet wall collission and bouncing working
- TODO:
  - Ship bouncing
  - Ship shielding
  - Ship auto-shielding on bullets
  - Bunker bullet to ship collision
  - Ship bullet to bunker collision
  - Ship to bunker collision
  - Ship fuel acquisition
  - Ghost walls
  - Wind (static gravity)
  - Magnetic (generated gravity/repulsion)

### 5. Drawing

- Wall drawing complete. Phew.
  - This was a lot the initialization of walls is complicated and involves a massive switch statement to find pre-rendered patches
  - Wall rendering uses a lot of very specific 68k assembly. Eventually I had to just write a basic 68k instruction emulator to get the walls to render correctly. But they do. So far all the glitches I have found in rendering, are there in the original game as well (e.g., the frowny face in level 9)
- Created a sprite service to load sprites for game objects and the status bar
- Finished all game rendering functions using our MonochromeBitmap renderer
- Special handling of the fizz affect
- Added ability to use a fixed background pattern (which i'm hoping will alleviate how annoying the crosshatch is on an LCD screen...)

### 6. Meta

- Created status slice
- TODO:
  - Have renders trigger off slice updates
  - Highscores

### 7. Demo/Cartoon/Autopilot ?

### 8. Planet Editor?
