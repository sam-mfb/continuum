# continuum

## Overview

This is a browser port of the classic Macintosh game Continuum.

It is based on the original source code and related files released publicly by the original developers [here](https://www.ski-epic.com/continuum_downloads/).

All of the original developers files are in the `orig` folder in this repository.

You can try it out live at [continuumjs.com](https://continuumjs.com).

## Project Origin

Continuum was one of my favorite games on my first computer -- a Macintosh Plus. A smooth-scrolling, physics-based "asteroids in a maze" type of game, I spent hours playing the game, trying to beat my high score, defining levels, etc. It was also one of my first, if nnot my actual first, experiences with a high quality shareware (ok, "beerware") games.

In more recent years I've tried to play it on an emulator, like Basilisk II or vMac, and it works, mostly. (One of the easiest ways to try that experience is using the MACE project which as self-contained emulator package of the game [here](https://mace.home.blog/files/).) There are some minor glitches, but the biggest annoyance with emulation is that the gray cross-hatch background looks terrible when it scrolls on a modern LCD screen.

About five years ago, I learned that the original developers, Brian and Randy Wilson, had released the source code into the public domain. I was just getting back into javascript programming at the time and I thought it would be fun to see if I could port it. After a few days, I was able to build a decoder for the galaxy files and use that to display basic maps of the game levels. But when I started to dig into the actual game play and rendering, I realized there was a lot of 68k assembly that was going to be a bear to port. That, and I was getting pretty busy caused me to shelve the project.

Fast-forward to 2025 and I'm a better javascript/typescript programmer but, more importantly, we have LLM-assisted coding. On a whim, I wondered what would happen if I tried to get Claude Code to help me with the project, and, well, here we are. This isn't a "vibe-coded" project, but it was _heavily_ AI-assisted -- especially the ports of the 68k assembler parts.

## Motivation and Goals

I wanted to make a port that moved the game onto a modern browser, but also maintained the overall structure, logic, and "feel" of the original game's code. I actually learned to program on Think C on a 68K Mac, and so diving back into bit-packing, off-screen graphics worlds, and bitwise operations was a bit of a nostalgia trip. More than that, it's just amazing to realize what developers at the time--and this game's developer in particular--had to do to get an optimized, compact game to run on sub-10mhz hardware. So, I've tried to make it so that reading the modern game's code gives you a fairly accurate sense of what the original code was like.

That said, I have some ambition of some day maybe expanding the game, modernizing the sound/graphics etc., and so I wanted to follow some modern development practices that would make the game easier to maintain. In particular, I wanted to keep things modular, have good seperation of concerns, and following general functional and immutable-data paradigms.

In short, the final code is _largely_ faithfuly to the original

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
