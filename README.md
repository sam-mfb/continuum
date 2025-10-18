# Continuum JS

## Overview

This is a browser port of the classic Macintosh game Continuum.

It is based on the original source code and related files released publicly by the original developers [here](https://www.ski-epic.com/continuum_downloads/).

All of the original developers files are in the `orig` folder in this repository.

You can try it out live at [continuumjs.com](https://continuumjs.com).

NB: as explained below there are a things I have tweaked from the original implementation to make the experience a little nicer on modern systems. Specifically: (1) a fixed background, rather than moving, (2) a modern collision-map for collision detections, (3) a sound mixer. If you don't like any of these (or if you find bugs in them), you can revert to the original game implementation via options in the Settings wheel. (Of course, if you find bugs, please report!) Your settings will persist over reloads.

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

#### Sidenote - Collision Handling

One place the original code had state and rendering deeply intertwined was collision detection. This was for a pretty cool reason. In the original game, the way it determined if your ship collided with a bullet, bunker, or wall, was by checking at drawing time if a ship's black pixel was being drawn over an existing, non-background, black pixel. In other words, it didn't use collision boxes or proximity checks (other game collisions use proximity checks -- like fuel pickups and bunker deaths), it literally gave you what-you-see-is-what-you-get for ship collisions. If any part of your ship was touching a black pixel -- BOOM (or bounce if it was a bouncy wall). That was both precise and efficient, but it means that ship rendering and ship collisions are inextricably tied together. At least if you keep the original implementation.

I initially implemented the game with the same system as the original -- and you can still play it that way by going into settings and toggling the Collision Mode setting to "Original". However, I eventually ended up implement a fully abstracted collision map system that separates rendering from collisions entirely. It still creates pixel accurate collision maps so the behavior should be identical to the original game, but it is a reasonably significant deviation. This is the default setting, but as noted you can switch back to the original. That said, one of the reasons for switching (aside from just being OCD) was because decoupling state from rendering opens up some interesting possibilities for new features, like, new graphics, game recording, validated high-scores, etc. If those get implemented, they may not work with the original collision mode.

### 2. Rendering

The basic premise of rendering is to have a data structure that represents the Mac's black and white screen, pass that through a series of pure rendering functions that change the pixels and return a new screen, and then when everything is ready, just dump the screen onto a 2D Canvas. The original game synced to the Mac's V-Sync which was 20fps so that's what I use here. I put in a little logic to let me increase the framerate if I wanted to but I haven't done that yet. This overall system is fairly consistent with the original game's double-buffering -- where it wrote to a buffer and then blitted it onto the screen, I write to a data structure and then render that at the end. This similarity allowed me to make a series of render functions that pretty much map one-to-one to the original game's.

#### Sprites

Rendering sprites was pretty easy. There's some decoding and masking to deal with, but nothing super complicated. They are just black and white bitmaps.

#### Walls

This was probably the hardest part of the project, and I almost threw in the towel. The original game had a very esoteric (and performant!) way of drawing walls in assembly. Even with LLM help it took me forever to get this pixel perfect (but I think it is now!). At the end of the day I found the easiest way was to write a mini 68k/asm emulation layer (nothing fancy, just the instructions mimicked in javascript) and then writing the renderers as basically line for line copies of the original. That was honestly the only way (short of becoming a 68k assembly expert) I could replicate the exact drawing of the game.

If you are reading the code, something that confused me for a bit (and that ALWAYS confuses the LLMs) is that the various routines routines for drawing walls that have "black" in their title, e.g., "ne_black()", "sse_black()", etc., don't JUST draw black. They also draw some white sections. Some of Randy's notes on the game explain this a little. I think what happened was he originally had the game draw white sections and black sections of walls in two passes, and then realized that wasn't performant and so added some of the white drawing into the black drawing routines, but never changed the name.

#### THE BACKGROUND PATTERN

The most annoying thing about running Continuum on a modern computer is the gray cross-hatch pattern. It looks awful when it scrolls on a modern LCD. However, it's no simple matter to swap in some other background since the original drawing routines rely (heavily) on XOR'ing against the background pattern. But it turns out there's a pretty easy fix which is just to not scroll the background. That does make the edges of the walls and the sprites "shimmer" a little when things are moving, but I think that's a better outcome than the scrolling gray cross-hatch, and still looks pretty much like the original.

There's an option for you to do it either way, so you _can_ still use the original moving background.

It's not a totally easy matter to swap in a "real" grayscale background because a number of places in the game rendering relying on XORing bits against the cross-hatch background. Not the hardest thing in the world to overcome, but would require a little more surgery than just simply drawing gray underneath the game screen.

#### Animations

These were pretty easy. One cool thing is the fizz/transition that happens at the end of the level. This doesn't actually work on some emulators (at least not Basilisk II or the MACE bundle). I think the reason is because this isn't really a v-synced animation. The game just runs its little random-fizz generating algorithm and I think just depended on the slow speed of the processor to have it render as an animation. On a modern CPU it would finish in like a millisecond, so I actually had to force the animation to get spread out. To figure out what the timing of it should be, I recorded it playing on a Mac Plus I have. The video's in the repo.

#### Modern Rendering Engine

There is an option to turn on a "modern" rendering engine. That renders the sprites and walls using Canvas's native drawing routines rather than a pixel based approach. It is more flexible, but it isn't a pixel perfect match to the original game. If you enable the modern rendering mode, youc an also have it use a solid gray background rather than a the cross-hatch from the original game. If I extend/upgrade the games graphics this is the engine I'd use going forward...

You can turn this on in the settings.

### 3. Sound

The original game just wrote its sounds directly to the sound buffer of the Mac, so basically the sound equivalent of a black and white bitmap. This meant, among other things, that the frequency was totally off from the frequency used by a browser--or any modern sound system. The solution was to use a ring buffer and have the game write its sound to the buffer and then have the browser read from the buffer with the timing it wants. That worked pretty well as a concept.

A problem I had--which still isn't perfect--is getting the right "generator" routines to generate the 8bit sound samples. These were all algorithmic in the original game and in assembly. I ended up using the same asm/68k assembly harness trick here as with graphics, but there are still a few glitches (at least to my ear). I think the ship explosion is a little too high pitched and the shield might be a little too low. I'm not sure.

The other thing with sound was separating it out from state management. The original game essentially played sounds _wherever_ which meant they didn't always play in sync with animation frames. This, coupled with the fact that new sounds interrupt old sounds, meant that sounds cut each other off at intervals that didn't correspond to a frame break.

This is implemented with a Redux listener that listens for the relevant events in Redux and plays sounds accordingly. Similar to the original game, this is not synced to a frame. Sounds fire whenever the redux event occurs -- however the timing may not be exactly the same largely because I can't really control how fast Redux runs vs the original Mac hardware or how our sound service plays vis a vis the timing of the original Mac sounds. (Or to be more precise, I'm not spending the time to figure things out at that level of granularity). But I think it's pretty close regardless.

Interesting thing about the original game is that it didn't "mix" sounds, even though sometimes it sounds like they are. Instead, it implemented a "priority" system for determining which sounds could "override" other sounds. These priorities for certain sounds also decayed every VBS interval allowing in theory for multiple sounds of the same kind to override each other. This is all implemented in our sound service.

There is now an implementation available that actually mixes sounds to avoid the occasional "choppiness" of the original system. I thought a bit about what the "default" should be and decided to make the default the modern system with mixed sounds. I think it is still true to the spirit of the original game, and in fact slightly enhances the air of chaos that was there when multiple shots and explosions are going on at once. If you are a purist, you can switch back to the old system in settings.

### 4. File Parsing

We parse the original galaxy files and resources from the original game. I got the resources out using ResEdit and Resourcer. Yes, copy and paste -- thank you [infinite mac](https://infinitemac.org).

BTW, at some point _after_ i did this, I learned about (resource_dasm)[https://github.com/fuzziqersoftware/resource_dasm] which is a much friendlier way to get old 68k resources in a modern dev environment. Next time ;)

The game also makes available some additional levels that were either distributed by the authors or by others on the internet. the Zephyr levels are particularly interesting as they really were pushing the limits of the physics engine and discovering quirks. On some of the levels it seems like they were relying on bugs to allow you to beat the level -- I hope I've properly "ported" those bugs...

## Codebase/Compiling

It's a vite/React project. You can run it with:

```bash
npm run game
```

Or build it with

```bash
npm run build:game
```

There's also a development harness of sorts I used to test out various pieces of things as I was putting it together. You can see that by running:

```bash
npm run dev
```

There was a lot of LLM-assisted coding in this project. More than I would do--or at least allow to be unchecked--in a real production codebase. But everything is fairly organized and is well cited back to the original code. I'd like to clean it up a little more at some point...
