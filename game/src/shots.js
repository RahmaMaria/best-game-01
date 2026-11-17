// Emberfall — the screenshot scenes behind ?shot=start|play|boss|end. Each one plays
// the real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot (flee what is close, chase embers, shoot the nearest foe),
// so the frame is what a short game really looks like and the same seed always
// gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 10;
const BOSS_SECONDS = 11;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** A silent stand-in for the audio system: screenshots make no sound. */
export const silentAudio = {
  shoot() {}, enemyDie() {}, bruteDie() {}, hurt() {}, ember() {}, powerup() {},
  dash() {}, waveHorn() {}, bossRoar() {}, victory() {}, gameOver() {}, click() {},
  unlock() {}, toggleMute() { return true; }, stopMusic() {},
};

/**
 * Steer the ship: flee the nearest danger, drift toward the closest ember when
 * it is safe, always aim at the nearest foe and fire, dash when cornered.
 */
export function autopilot(state) {
  const p = state.player;
  let target = null;
  let targetDist = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < targetDist) {
      targetDist = d;
      target = e;
    }
  }
  let mx = 0;
  let my = 0;
  // Flee anything close, orbs included.
  let dangerX = 0;
  let dangerY = 0;
  let danger = 0;
  for (const e of state.enemies) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 150) {
      const w = (150 - d) / 150;
      dangerX += (dx / d) * w;
      dangerY += (dy / d) * w;
      danger += w;
    }
  }
  for (const o of state.orbs) {
    const dx = p.x - o.x;
    const dy = p.y - o.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 150) {
      const w = (150 - d) / 150;
      dangerX += (dx / d) * w;
      dangerY += (dy / d) * w;
      danger += w;
    }
  }
  if (danger > 0.4) {
    mx = dangerX;
    my = dangerY;
  } else {
    // Chase the nearest ember; else drift toward the centre.
    let ember = null;
    let emberDist = Infinity;
    for (const em of state.embers) {
      const d = Math.hypot(em.x - p.x, em.y - p.y);
      if (d < emberDist) {
        emberDist = d;
        ember = em;
      }
    }
    const tx = ember ? ember.x : FIELD.width / 2;
    const ty = ember ? ember.y : FIELD.height / 2;
    const dx = tx - p.x;
    const dy = ty - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 24) {
      mx = dx / d;
      my = dy / d;
    }
  }
  // Keep inside a margin so the pilot never hugs the edge.
  if (p.x < 90) mx += 0.8;
  if (p.x > FIELD.width - 90) mx -= 0.8;
  if (p.y < 90) my += 0.8;
  if (p.y > FIELD.height - 90) my -= 0.8;
  const len = Math.hypot(mx, my) || 1;
  const aimAngle = target ? Math.atan2(target.y - p.y, target.x - p.x) : -Math.PI / 2;
  let nearestOrb = Infinity;
  for (const o of state.orbs) {
    const d = Math.hypot(o.x - p.x, o.y - p.y);
    if (d < nearestOrb) nearestOrb = d;
  }
  return {
    mx: mx / len,
    my: my / len,
    aimAngle,
    firing: target !== null,
    dash: (targetDist < 64 || nearestOrb < 90) && p.dashCooldown <= 0,
  };
}

/**
 * The careless pilot: it flies straight at the nearest foe and never dodges,
 * so the end scene reaches a real game over the way a hurried player does.
 */
export function carelessPilot(state) {
  const p = state.player;
  let target = null;
  let targetDist = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < targetDist) {
      targetDist = d;
      target = e;
    }
  }
  if (!target) return { mx: 0, my: 0, aimAngle: -Math.PI / 2, firing: false, dash: false };
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  return {
    mx: dx / d,
    my: dy / d,
    aimAngle: Math.atan2(dy, dx),
    firing: true,
    dash: false,
  };
}

/**
 * Set `world` to the named scene (start, play, boss or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world, effects, audio) {
  world.reset();
  if (name !== 'play' && name !== 'boss' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, { mx: 0, my: 0, aimAngle: -Math.PI / 2, firing: false, dash: false }, effects, audio, true);
      effects.step(STEP);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'boss') {
    world.startWave(10);
    let placed = false;
    for (let i = 0; i < BOSS_SECONDS / STEP; i += 1) {
      const events = world.step(STEP, autopilot(world.state), effects, audio, false);
      effects.step(STEP);
      if (!placed) {
        const warden = world.state.enemies.find((e) => e.kind === 'warden');
        if (warden) {
          // Bring the Warden into frame for the shot, as a player reaching it would see it.
          warden.x = 880;
          warden.y = 210;
          placed = true;
        }
      }
      if (events & (EVENT_OVER | EVENT_WIN)) break;
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  // The play scene drops straight into wave 4, where wisps, spitters, a brute
  // and splitters converge at once, and the pilot fights through it.
  world.startWave(name === 'play' ? 4 : 1);
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  for (let i = 0; i < limit / STEP; i += 1) {
    // The end scene's pilot flies at the foe and never dodges, so it is caught
    // out as a hurried player is; the play pilot plays to survive.
    const input = name === 'end' ? carelessPilot(world.state) : autopilot(world.state);
    const events = world.step(STEP, input, effects, audio, false);
    effects.step(STEP);
    if (events & (EVENT_OVER | EVENT_WIN)) break;
  }
  const over = world.state.player.hull <= 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}

export { SAMPLE };
