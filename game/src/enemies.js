// Emberfall — the things that hunt the player. Four kinds plus the Warden boss,
// each with its own movement and attack; the world owns spawning and collisions,
// this file owns how each kind behaves.
import { ENEMY, FIELD, ORB } from './config.js';

export const KIND_WISP = 'wisp';
export const KIND_SPITTER = 'spitter';
export const KIND_BRUTE = 'brute';
export const KIND_SPLITTER = 'splitter';
export const KIND_WARDEN = 'warden';

const SPECS = {
  [KIND_WISP]: ENEMY.wisp,
  [KIND_SPITTER]: ENEMY.spitter,
  [KIND_BRUTE]: ENEMY.brute,
  [KIND_SPLITTER]: ENEMY.splitter,
  [KIND_WARDEN]: ENEMY.warden,
};

let nextId = 1;

export function createEnemy(kind, x, y, wave) {
  const spec = SPECS[kind];
  const scale = 1 + Math.min(0.5, (wave - 1) * 0.04);
  return {
    id: nextId,
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: spec.radius,
    speed: spec.speed * (0.9 + Math.random() * 0.2),
    hull: Math.round(spec.hull * scale),
    maxHull: Math.round(spec.hull * scale),
    score: spec.score,
    touch: spec.touch,
    ember: spec.ember,
    color: spec.color,
    angle: Math.random() * Math.PI * 2,
    wobble: Math.random() * Math.PI * 2,
    shootTimer: 2 + Math.random() * 2,
    burstTimer: 3,
    spawnTimer: 0,
    flash: 0,
    active: true,
    dead: false,
  };
}

/** A spawn point just outside one edge of the field. */
export function edgeSpawn(random) {
  const side = random.int(0, 3);
  const m = 40;
  if (side === 0) return { x: random.range(0, FIELD.width), y: -m };
  if (side === 1) return { x: FIELD.width + m, y: random.range(0, FIELD.height) };
  if (side === 2) return { x: random.range(0, FIELD.width), y: FIELD.height + m };
  return { x: -m, y: random.range(0, FIELD.height) };
}

/**
 * Steer one enemy for a step. Returns 'shoot' when a spitter fires, 'burst' when
 * the Warden looses a radial burst, 'spawn' when the Warden calls wisps.
 */
export function updateEnemy(enemy, dt, player, random) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  enemy.wobble += dt * 2;
  enemy.flash = Math.max(0, enemy.flash - dt * 6);

  if (enemy.kind === KIND_WISP) {
    const wob = Math.sin(enemy.wobble) * 0.5;
    const px = -ny * wob;
    const py = nx * wob;
    enemy.vx += (nx * enemy.speed + px * 60 - enemy.vx) * Math.min(1, dt * 3);
    enemy.vy += (ny * enemy.speed + py * 60 - enemy.vy) * Math.min(1, dt * 3);
    enemy.angle = Math.atan2(enemy.vy, enemy.vx);
  } else if (enemy.kind === KIND_SPITTER) {
    // Holds a ring around the player and fires orbs from range.
    const want = 260;
    const radial = dist > want + 30 ? 1 : dist < want - 30 ? -0.8 : 0;
    const strafe = Math.sin(enemy.wobble * 0.7) * 0.8;
    enemy.vx += ((nx * radial + -ny * strafe) * enemy.speed - enemy.vx) * Math.min(1, dt * 2.5);
    enemy.vy += ((ny * radial + nx * strafe) * enemy.speed - enemy.vy) * Math.min(1, dt * 2.5);
    enemy.angle = Math.atan2(dy, dx);
    enemy.shootTimer -= dt;
    if (enemy.shootTimer <= 0 && dist < 520) {
      enemy.shootTimer = 2.2 + random.range(0, 1.2);
      return 'shoot';
    }
  } else if (enemy.kind === KIND_BRUTE) {
    enemy.vx += (nx * enemy.speed - enemy.vx) * Math.min(1, dt * 1.8);
    enemy.vy += (ny * enemy.speed - enemy.vy) * Math.min(1, dt * 1.8);
    enemy.angle = Math.atan2(enemy.vy, enemy.vx);
  } else if (enemy.kind === KIND_SPLITTER) {
    const dart = Math.sin(enemy.wobble * 1.4) > 0.55 ? 1.9 : 0.85;
    enemy.vx += (nx * enemy.speed * dart - enemy.vx) * Math.min(1, dt * 3.5);
    enemy.vy += (ny * enemy.speed * dart - enemy.vy) * Math.min(1, dt * 3.5);
    enemy.angle = Math.atan2(enemy.vy, enemy.vx);
  } else if (enemy.kind === KIND_WARDEN) {
    // The Warden stalks slowly, fires radial bursts and calls wisps.
    enemy.vx += (nx * enemy.speed - enemy.vx) * Math.min(1, dt * 1.5);
    enemy.vy += (ny * enemy.speed - enemy.vy) * Math.min(1, dt * 1.5);
    enemy.angle += dt * 0.6;
    enemy.burstTimer -= dt;
    if (enemy.burstTimer <= 0) {
      enemy.burstTimer = 3.2;
      return 'burst';
    }
    enemy.spawnTimer -= dt;
    if (enemy.spawnTimer <= 0) {
      enemy.spawnTimer = 6;
      return 'spawn';
    }
  }

  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;
  return null;
}

/** The Warden's radial burst: orbs in every direction from its centre. */
export function wardenBurst(enemy) {
  const orbs = [];
  const count = 12;
  const offset = Math.random() * Math.PI * 2;
  for (let i = 0; i < count; i += 1) {
    const a = offset + (i / count) * Math.PI * 2;
    orbs.push({ x: enemy.x, y: enemy.y, vx: Math.cos(a) * ORB.speed, vy: Math.sin(a) * ORB.speed, radius: ORB.radius, active: true });
  }
  return orbs;
}

/** A spitter's aimed orb at the player. */
export function spitterOrb(enemy, player) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  return { x: enemy.x, y: enemy.y, vx: (dx / dist) * ORB.speed, vy: (dy / dist) * ORB.speed, radius: ORB.radius, active: true };
}
