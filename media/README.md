Some things in Continuum don't work in emulation.

One that I know of is the "fizz" effect at the end of a level. This basically runs an algorithm to replace the pixels of one screen with those of the next in a random fashion so it creates a dissolving affect. The way this worked in Continuum was it just let the algorithm run and, in effect, the time it took for the algorithm to run on the processor was the time it took for the effect to display. There was no timing or synchronization.

Obviously emulators must try to replicate the timing of old CPUs or else everything would run to fast, but something about how this function was implemented gets past them. Depending on which version of Continuum you run on Basilisk it either goes right to the next level (v1.0.3) or shows the starfield (1.0.4) -- but neither show the fizz.

Given this, I had no easy well to tell how long the effect should take or to verify that my implementation worked correctly.

To get around this, I wrote a "fizz" function that uses the original games algorithm but allows you to determine in advance how many "frames" it should run across. The question then was how many frames that should be. To figure this out, I got the game running on an old Mac Plus, recorded it, and timed it.

The result is the fizz.mp4 file here. And based on that: (a) yes, i think the implementation is accurate, and (b) the timing is approximately 1.3 seconds or 26 frames at the game's logical framerate of 20 fps.
