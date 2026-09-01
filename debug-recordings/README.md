# debug-recordings

Scratch space for recordings attached to bug reports, so they can be replayed
headlessly against the game logic in this repo.

Drop the `.bin` here (GitHub wraps issue attachments in a `.zip` — unzip first)
and commit it on the investigation branch. Files here are working artifacts for
a specific bug; delete them once the bug is closed.

## Replaying one

```
# event timeline: level loads, bunker kills, transition phases, deaths
npm run analyze-recording -- debug-recordings/<file>.bin

# every frame in a window, once the timeline shows where to look
npm run analyze-recording -- debug-recordings/<file>.bin --from 1200 --to 1320

# does the replay still reproduce the recorded state exactly?
npm run validate-recording -- debug-recordings/<file>.bin
```

`analyze-recording` reports, per frame: level, transition phase and countdowns,
bunkers still alive, ship dead-count / death-flash frames, lives, fuel, ship and
viewport position, live sparks, and the status-bar message.
