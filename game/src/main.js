// Emberfall — boot and the one loop: input is read every frame, the world advances
// in fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens: title,
// play, paused, game over and victory.
//
// ?seed=N fixes the spawn pattern. ?shot=start|play|boss|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, BEST_WAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createEffects } from './particles.js';
import { EVENT_HIT, EVENT_OVER, EVENT_WAVE_CLEAR, EVENT_WIN, createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import {
  SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, createRenderer,
} from './render.js';
import { silentAudio, stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const effects = createEffects();
const audio = createAudio();

function readBest(key) {
  try {
    return Number.parseInt(window.localStorage.getItem(key) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world, effects, silentAudio);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, 1, world.enemiesLeft, effects);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest(BEST_KEY);
  let bestWave = readBest(BEST_WAVE_KEY);
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    audio.click();
    world.reset();
    world.startWave(1);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Wave 1. Feed your lantern with embers.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(BEST_KEY, best);
    }
    if (world.state.wave > bestWave) {
      bestWave = world.state.wave;
      saveBest(BEST_WAVE_KEY, bestWave);
    }
    if (won) audio.victory();
    else audio.gameOver();
    announce(won
      ? `Victory. Score ${world.state.score}. Best ${best}.`
      : `Game over. Score ${world.state.score}. Best ${best}. Press R to fly again.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
    } else if (actions & ACTION_RESTART && (screen === SCREEN_OVER || screen === SCREEN_WIN || screen === SCREEN_TITLE)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function handleClick() {
    const click = input.takeClick();
    if (!click) return;
    audio.unlock();
    const fx = (click.x - renderer.offsetX) / renderer.scale;
    const fy = (click.y - renderer.offsetY) / renderer.scale;
    const button = renderer.hitButton(fx, fy);
    if (screen === SCREEN_TITLE && (button === 'LIGHT THE LANTERN' || button === null)) startGame();
    else if ((screen === SCREEN_OVER || screen === SCREEN_WIN) && (button === 'FLY AGAIN  (R)' || button === null)) startGame();
    else if (screen === SCREEN_PAUSED && button === 'RESUME') screen = SCREEN_PLAY;
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { mx: 0, my: 0, aimAngle: -Math.PI / 2, firing: false, dash: false }, effects, audio, true);
      return;
    }
    const move = input.move();
    const aim = input.aim(world.state.player.x, world.state.player.y, renderer.scale, renderer.offsetX, renderer.offsetY);
    const events = world.step(STEP, {
      mx: move.x,
      my: move.y,
      aimAngle: aim.angle,
      firing: input.firing,
      dash: input.dashing,
    }, effects, audio, false);
    if (events & EVENT_OVER) endGame(false);
    else if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_HIT) announce(`Hit. ${world.state.player.hull} hull left.`);
    else if (events & EVENT_WAVE_CLEAR) announce(`Wave ${world.state.wave} clear.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    handleClick();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
        if (effects.hitStop > 0) {
          accumulator = 0;
          break;
        }
      }
    } else {
      accumulator = 0;
    }
    effects.step(STEP);
    renderer.draw(world.state, screen, best, bestWave, world.enemiesLeft, effects);
  }

  // Leaving the tab pauses a running game rather than letting the dark close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });
  // First gesture unlocks the synthesised sound.
  window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
  window.addEventListener('keydown', () => audio.unlock(), { once: true });

  announce('Emberfall. Press Enter or click to light the lantern.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
