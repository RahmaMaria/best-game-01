[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/RahmaMaria/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/RahmaMaria/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

# Emberfall — Last Light of the Hollow Star

An entry for the [best-game-01 competition on make.fun](https://make.fun/bounty/best-game-01): a complete, original, offline browser game. No libraries, no network requests, no copied assets — every line, picture and sound was made for this game.

## The game

Your lantern-ship is the only light left in a drowned-violet night. The dark
sends wisps, spitters, brutes and splitters at you for ten waves, and the
Warden — a burning crowned sun — waits at the end of wave 10.

- **Light is life.** Your lantern always burns down. Fallen foes drop embers;
  collect them to feed the light. When the light hits zero, the dark eats
  your hull.
- **Fly and fight.** WASD or arrows to fly, mouse to aim, hold click or Space
  to fire, Shift to dash through danger. Combos multiply your score up to x8.
- **Power-ups.** Spread shot, rapid fire, an aegis shield and an ember magnet
  drop from fallen foes.
- **Win or lose.** Burn the Warden down to win; lose all three hull to fall.
  Best score and best wave are kept between visits.

## Feel

Particles on every kill, screen shake, hit-stop on heavy kills, floating
score text, wave banners, a light radius that visibly closes in as your
lantern fades, and a fully synthesised WebAudio soundscape — effects plus a
quiet bass loop, with M to mute. Pause with P; restart with R.

## Play it

```sh
node serve.ts
# then open http://localhost:8080
```

Or open `game/index.html` from any static file server. Desktop Chrome,
keyboard and mouse.

## Layout

- `main.ts` — the entry program: copies `game/` and `screenshots/` to the
  output and writes `dossier.json` with the vendored make.fun library.
- `game/index.html` — the page, one canvas.
- `game/src/config.js` — every tuning number and colour.
- `game/src/random.js` — the seeded random source behind replayable shots.
- `game/src/audio.js` — synthesised sound effects and music (WebAudio, no files).
- `game/src/input.js` — keyboard and mouse.
- `game/src/particles.js` — pooled particles, shockwave rings, floating text.
- `game/src/enemies.js` — the five foe kinds and the Warden's attacks.
- `game/src/world.js` — the game itself: waves, light, collisions, score.
- `game/src/render.js` — everything the player sees, HUD and screens.
- `game/src/shots.js` — the staged screenshot scenes and their autopilot.
- `game/src/main.js` — boot and the one fixed-step loop.
- `screenshots/` — four real captures of the game running (`?shot=start|play|boss|end`, seed 7).

## License

MIT — see [LICENSE](LICENSE).
