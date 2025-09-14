# Continuum JS

## Overview

This is a browser port of the classic Macintosh game Continuum.

It is based on the original source code and related files released publicly by the original developers [here](https://www.ski-epic.com/continuum_downloads/).

All of the original developers files are in the `orig` folder in this repository.

You can try it out live at [continuumjs.com](https://continuumjs.com).

## Project Origin

Continuum was one of my favorite games on my first computer -- a Macintosh Plus. A smooth-scrolling, physics-based "asteroids in a maze" type of game, I spent hours playing the game, trying to beat my high score, defining levels, etc. It was also one of my first, if not my actual first, experiences with a high quality shareware (ok, "beerware") game.

In more recent years I've tried to play it on an emulator, like Basilisk II or vMac, and it works, mostly. (One of the easiest ways to try that experience is using the MACE project which has a self-contained emulator package of the game [here](https://mace.home.blog/files/).) There are some minor glitches, but the biggest annoyance with emulation is that the gray cross-hatch background looks terrible when it scrolls on a modern LCD screen.

About five years ago, I learned that the original developers, Brian and Randy Wilson, had released the source code into the public domain. I was just getting back into javascript programming at the time and I thought it would be fun to see if I could port it. After a few days, I was able to build a decoder for the galaxy files and use that to display basic maps of the game levels. But when I started to dig into the actual game play and rendering, I realized there was a lot of 68k assembly that was going to be a bear to port. That, and I was getting pretty busy caused me to shelve the project.

Fast-forward to 2025 and I'm a better javascript/typescript programmer but, more importantly, we have LLM-assisted coding. On a whim, I wondered what would happen if I tried to get Claude Code to help me with the project, and, well, here we are. This isn't a "vibe-coded" project, but it was _heavily_ AI-assisted -- especially the ports of the 68k assembler parts.

## Motivation and Goals

I wanted to make a port that moved the game onto a modern browser, but also maintained the overall structure, logic, and "feel" of the original game's code. I actually learned to program on Think C on a 68K Mac, and so diving back into bit-packing, off-screen graphics worlds, and bitwise operations was a bit of a nostalgia trip. More than that, it's just amazing to realize what developers at the time--and this game's developer in particular--had to do to get an optimized, compact game to run on sub-10mhz hardware. So, I've tried to make it so that reading the modern game's code gives you a fairly accurate sense of what the original code was like.

That said, I have some ambition of some day maybe expanding the game, modernizing the sound/graphics etc., and so I wanted to follow some modern development practices that would make the game easier to maintain. In particular, I wanted to keep things modular, have good separation of concerns, and follow general functional and immutable-data paradigms.

In short, the final code is _largely_ faithful to the original but with adjustments for modern systems and language paradigms and probably just some places where I had to "make it work" (although hopefully there aren't many of those).

## Architecture and Porting

Notes on the architecture of the port and the experience of porting it. You can find a lot more detail on this (more than you want) in the arch/ folder at the root of the repo.

As an initial matter, I have to note that I have made basically no effort to optimize things, nor was it necessary. The difference between the hardware this game originally ran on and modern hardware (even running javascript in a browser) is insane. You have so many cycles and so much memory to play with these days. That actually made the port a lot easier because I could translate a lot of logic one-to-one without needing to worry about performance.

### 1. State Management

The game's entire state is managed in Redux. I think Redux is one of those things you either love or hate. I love it, and it makes it much easier for me to think about state management and, importantly, keeping state management separate from everything else. The original code actually did a _pretty good_ job at that, but (a) it of course mutated things in place -- no other choice with 128kb of RAM and (b) mixed rendering/sounds into some of the state management. The first thing was not a big deal -- some pointer arithmetic needed to be changed to arrays, but on the whole moving to a unidirectional data flow wasn't that big a deal. I like to modularize state into slices (thank you RTK!), and so getting that set up was slightly more effort, but not much. The second thing -- pulling out the rendering and sound -- took a little bit of work and required a few changes to the game's mechanics (especially the sound) but also wasn't that big a deal.

The net result is that the game's state is fully managed by Redux and fully separate from sound, rendering, controls, etc. So you could easily add new graphics and sound to it if you wanted. (And maybe make it work with a game controller?)

### 2. Rendering

The basic premise of rendering is to have a data structure that represents the Mac's black and white screen, pass that through a series of pure rendering functions that change the pixels and return a new screen, and then when everything is ready, just dump the screen onto a 2D Canvas. The original game synced to the Mac's V-Sync which was 20fps so that's what I use here. I put in a little logic to let me increase the framerate if I wanted to but I haven't done that yet. This overall system is fairly consistent with the original game's double-buffering -- where it wrote to a buffer and then blitted it onto the screen, I write to a data structure and then render that at the end. This similarity allowed me to make a series of render functions that pretty much map one-to-one to the original game's.

#### Sprites

Rendering sprites was pretty easy. There's some decoding and masking to deal with, but nothing super complicated. They are just black and white bitmaps.

#### Walls

This was probably the hardest part of the project, and I almost threw in the towel. The original game had a very esoteric (and performant!) way of drawing walls in assembly. Even with LLM help it took me forever to get this pixel perfect (but I think it is now!). At the end of the day I found the easiest way was to write a mini 68k/asm emulation layer (nothing fancy, just the instructions mimicked in javascript) and then writing the renderers as basically line for line copies of the original. That was honestly the only way (short of becoming a 68k assembly expert) I could replicate the exact drawing of the game.

#### THE BACKGROUND PATTERN

The most annoying thing about running Continuum on a modern computer is the gray cross-hatch pattern. It looks awful when it scrolls on a modern LCD. However, it's no simple matter to swap in some other background since the original drawing routines rely (heavily) on XOR'ing against the background pattern. But it turns out there's a pretty easy fix which is just to not scroll the background. That does make the edges of the walls and the sprites "shimmer" a little when things are moving, but I think that's a better outcome than the scrolling gray cross-hatch, and still looks pretty much like the original.

There's an option for you to do it either way, so you _can_ still use the original moving background.

#### Animations

These were pretty easy. One cool thing is the fizz/transition that happens at the end of the level. This doesn't actually work on some emulators (at least not Basilisk II or the MACE bundle). I think the reason is because this isn't really a v-synced animation. The game just runs its little random-fizz generating algorithm and I think just depended on the slow speed of the processor to have it render as an animation. On a modern CPU it would finish in like a millisecond, so I actually had to force the animation to get spread out. To figure out what the timing of it should be, I recorded it playing on a Mac Plus I have. The video's in the repo.

### 3. Sound

The original game just wrote its sounds directly to the sound buffer of the Mac, so basically the sound equivalent of a black and white bitmap. This meant, among other things, that the frequency was totally off from the frequency used by a browser--or any modern sound system. The solution was to use a ring buffer and have the game write its sound to the buffer and then have the browser read from the buffer with the timing it wants. That worked pretty well as a concept.

A problem I had--which still isn't perfect--is getting the right "generator" routines to generate the 8bit sound samples. These were all algorithmic in the original game and in assembly. I ended up using the same asm/68k assembly harness trick here as with graphics, but there are still a few glitches (at least to my ear). I think the ship explosion is a little too high pitched and the shield might be a little too low. I'm not sure.

The other thing with sound was separating it out from state management. The original game essentially played sounds _wherever_ which meant they didn't always play in sync with animation frames. This, coupled with the fact that new sounds interrupt old sounds, meant that sounds cut each other off at intervals that didn't correspond to a frame break. To implement sound with proper separation of concerns I basically accumulate sound "requests" in Redux and then play them at frame intervals -- with some priority ordering to determine which sounds should win if multiple ones play at the same time. The net result is that my sound timing isn't quite like the original game because all my sounds play at exact frame intervals. I think it's pretty good -- I could even argue my timing is better than the original -- but the purist in me can't help being bothered by the fact that my sound is definitely not EXACTLY like the original game.

### 4. File Parsing

We parse the original galaxy files and resources from the original game. I got the resources out using ResEdit and Resourcer. Yes, copy and paste -- thank you [infinite mac](https://infinitemac.org).

At some point I should add an interface to let you use arbitrary galaxy files.

## Still TODO

- The high score table. Of course.
- Planet editor

## Future Work

Better graphics and sound? Color? More levels? Fork it, and mess around!
