// Emberfall — the game itself: the player, the waves, the light, the score. The
// renderer only paints this state; the input only steers it. One fixed step at a
// time, so a screenshot seed replays exactly.
import {
  COMBO, EMBER, ENEMY, FIELD, FINAL_WAVE, ORB, PLAYER, POWERUP, STEP, WAVE_CLEAR,
} from './config.js';
import {
  KIND_BRUTE, KIND_SPITTER, KIND_SPLITTER, KIND_WARDEN, KIND_WISP,
  createEnemy, edgeSpawn, spitterOrb, updateEnemy, wardenBurst,
} from './enemies.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WAVE_CLEAR = 4;
export const EVENT_WIN = 8;
export const EVENT_KILL = 16;

/** What wave n sends at the player. The Warden comes alone on wave 10. */
export function waveComposition(wave) {
  if (wave >= FINAL_WAVE) return [{ kind: KIND_WARDEN, count: 1 }];
  const comp = [{ kind: KIND_WISP, count: 4 + wave }];
  if (wave >= 2) comp.push({ kind: KIND_SPITTER, count: 1 + Math.floor(wave / 2) });
  if (wave >= 3) comp.push({ kind: KIND_BRUTE, count: Math.floor((wave - 1) / 2) });
  if (wave >= 4) comp.push({ kind: KIND_SPLITTER, count: Math.floor(wave / 2) });
  return comp;
}

export function createWorld(random) {
  const state = freshState();
  let spawnQueue = [];
  let spawnTimer = 0;
  let clearTimer = 0;
  let wispTrickle = 0;
  let fadeTimer = 0;

  function freshState() {
    return {
      time: 0,
      wave: 0,
      waveState: 'title',
      player: {
        x: FIELD.width / 2,
        y: FIELD.height / 2,
        vx: 0,
        vy: 0,
        angle: -Math.PI / 2,
        hull: PLAYER.hull,
        light: PLAYER.lightMax,
        fireTimer: 0,
        dashTimer: 0,
        dashCooldown: 0,
        invulnerable: 0,
        spread: 0,
        rapid: 0,
        aegis: 0,
        magnet: 0,
        thrust: 0,
      },
      enemies: [],
      bullets: [],
      orbs: [],
      embers: [],
      powerups: [],
      score: 0,
      combo: 0,
      comboTimer: 0,
      comboBest: 0,
      kills: 0,
      waveKills: 0,
      banner: '',
      bannerTimer: 0,
      fading: false,
    };
  }

  function reset() {
    const fresh = freshState();
    for (const key of Object.keys(fresh)) state[key] = fresh[key];
    spawnQueue = [];
    spawnTimer = 0;
    clearTimer = 0;
    wispTrickle = 0;
    fadeTimer = 0;
  }

  function startWave(wave) {
    state.wave = wave;
    state.waveState = 'fight';
    state.waveKills = 0;
    spawnQueue = [];
    for (const part of waveComposition(wave)) {
      for (let i = 0; i < part.count; i += 1) spawnQueue.push(part.kind);
    }
    // Shuffle the queue so kinds arrive mixed.
    for (let i = spawnQueue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random.next() * (i + 1));
      [spawnQueue[i], spawnQueue[j]] = [spawnQueue[j], spawnQueue[i]];
    }
    spawnTimer = 0.4;
    wispTrickle = 0;
    state.banner = wave >= FINAL_WAVE ? 'THE WARDEN WAKES' : `WAVE ${wave}`;
    state.bannerTimer = 2.2;
  }

  function spawnEnemy(kind) {
    const at = edgeSpawn(random);
    state.enemies.push(createEnemy(kind, at.x, at.y, state.wave));
  }

  function dropEmbers(x, y, count, spread) {
    for (let i = 0; i < count; i += 1) {
      if (state.embers.length > 220) return;
      const a = random.angle();
      const v = spread ? random.range(40, 170) : random.range(10, 70);
      state.embers.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: EMBER.life,
        active: true,
      });
    }
  }

  function dropPowerup(x, y) {
    if (random.next() > POWERUP.dropChance || state.powerups.length >= 4) return;
    const kinds = ['spread', 'rapid', 'aegis', 'magnet'];
    state.powerups.push({ x, y, kind: random.pick(kinds), life: POWERUP.life, active: true, bob: random.range(0, Math.PI * 2) });
  }

  function addScore(base, x, y, effects) {
    const mult = Math.min(COMBO.max, 1 + Math.floor(state.combo / 4));
    const gained = base * mult;
    state.score += gained;
    if (effects) effects.floatText(x, y, `+${gained}`, mult > 1 ? '#ffcf5c' : '#f4f1ff', mult > 1 ? 18 : 14);
    return gained;
  }

  function killEnemy(enemy, effects, audio) {
    enemy.dead = true;
    state.kills += 1;
    state.waveKills += 1;
    state.combo += 1;
    state.comboTimer = COMBO.window;
    state.comboBest = Math.max(state.comboBest, state.combo);
    addScore(enemy.score, enemy.x, enemy.y, effects);
    dropEmbers(enemy.x, enemy.y, enemy.ember, true);
    dropPowerup(enemy.x, enemy.y);
    if (enemy.kind === KIND_BRUTE) {
      effects.burst(enemy.x, enemy.y, enemy.color, 26, 320, 0.8, 4);
      effects.ring(enemy.x, enemy.y, enemy.color, 150, 0.5);
      effects.addShake(7);
      effects.addHitStop(0.05);
      audio.bruteDie();
    } else if (enemy.kind === KIND_WARDEN) {
      effects.burst(enemy.x, enemy.y, '#ffb347', 60, 420, 1.1, 5);
      effects.burst(enemy.x, enemy.y, '#fff3c4', 30, 240, 0.9, 4);
      effects.ring(enemy.x, enemy.y, '#ffb347', 320, 0.9, 5);
      effects.addShake(14);
      effects.addHitStop(0.18);
      audio.bruteDie();
    } else {
      effects.burst(enemy.x, enemy.y, enemy.color, 14, 260, 0.55, 3);
      audio.enemyDie();
    }
    if (enemy.kind === KIND_SPLITTER) {
      for (let i = 0; i < 2; i += 1) {
        const wisp = createEnemy(KIND_WISP, enemy.x + (i === 0 ? -14 : 14), enemy.y, state.wave);
        wisp.vx = (i === 0 ? -1 : 1) * 160;
        state.enemies.push(wisp);
      }
    }
  }

  /** The player takes a hit: aegis absorbs it, else hull and light fall. */
  function damagePlayer(amount, effects, audio) {
    const p = state.player;
    if (p.invulnerable > 0 || p.dashTimer > 0) return false;
    if (p.aegis > 0) {
      p.aegis = 0;
      p.invulnerable = 1.0;
      effects.ring(p.x, p.y, '#7fe7ff', 130, 0.5);
      effects.floatText(p.x, p.y - 26, 'AEGIS', '#7fe7ff', 16);
      audio.hurt();
      return true;
    }
    p.hull -= amount;
    p.light = Math.max(0, p.light - PLAYER.hitLightLoss);
    p.invulnerable = PLAYER.invulnerable;
    effects.addShake(10);
    effects.addFlash(0.35);
    effects.burst(p.x, p.y, '#ff5a4e', 18, 300, 0.6, 3);
    audio.hurt();
    return true;
  }

  function stepPlayer(dt, input, effects, audio) {
    const p = state.player;
    p.fireTimer -= dt;
    p.dashCooldown -= dt;
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.spread = Math.max(0, p.spread - dt);
    p.rapid = Math.max(0, p.rapid - dt);
    p.aegis = Math.max(0, p.aegis - dt);
    p.magnet = Math.max(0, p.magnet - dt);

    // Light always burns down; embers are the only way back.
    p.light = Math.max(0, p.light - PLAYER.lightDrain * dt);
    state.fading = p.light <= 0;
    if (state.fading) {
      fadeTimer += dt;
      if (fadeTimer >= 2.5) {
        fadeTimer = 0;
        p.hull -= 1;
        effects.floatText(p.x, p.y - 30, 'THE DARK TAKES YOU', '#ff5a4e', 16);
        effects.addFlash(0.3);
        audio.hurt();
      }
    } else {
      fadeTimer = 0;
    }

    if (input.dash && p.dashCooldown <= 0 && p.dashTimer <= 0) {
      const dir = (input.mx !== 0 || input.my !== 0)
        ? { x: input.mx, y: input.my }
        : { x: Math.cos(p.angle), y: Math.sin(p.angle) };
      p.vx = dir.x * PLAYER.dashSpeed;
      p.vy = dir.y * PLAYER.dashSpeed;
      p.dashTimer = PLAYER.dashTime;
      p.dashCooldown = PLAYER.dashCooldown;
      p.invulnerable = Math.max(p.invulnerable, PLAYER.dashInvulnerable);
      effects.burst(p.x, p.y, '#7fe7ff', 10, 200, 0.4, 3);
      audio.dash();
    }

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
    } else {
      p.vx += input.mx * PLAYER.accel * dt;
      p.vy += input.my * PLAYER.accel * dt;
      const damp = Math.max(0, 1 - PLAYER.friction * dt);
      p.vx *= damp;
      p.vy *= damp;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > PLAYER.speed) {
        p.vx = (p.vx / speed) * PLAYER.speed;
        p.vy = (p.vy / speed) * PLAYER.speed;
      }
    }
    p.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, p.x + p.vx * dt));
    p.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius, p.y + p.vy * dt));
    p.angle = input.aimAngle;
    p.thrust = Math.hypot(input.mx, input.my) > 0 ? 1 : 0;
    if (p.thrust > 0 && Math.random() < 0.5) {
      const back = Math.atan2(p.vy, p.vx) + Math.PI;
      effects.trail(p.x + Math.cos(back) * 16, p.y + Math.sin(back) * 16, '#7fe7ff');
    }

    if (input.firing && p.fireTimer <= 0) {
      p.fireTimer = p.rapid > 0 ? 0.09 : PLAYER.fireInterval;
      const angles = p.spread > 0 ? [-0.17, 0, 0.17] : [0];
      for (const off of angles) {
        const a = p.angle + off;
        state.bullets.push({
          x: p.x + Math.cos(a) * 20,
          y: p.y + Math.sin(a) * 20,
          vx: Math.cos(a) * PLAYER.bulletSpeed,
          vy: Math.sin(a) * PLAYER.bulletSpeed,
          radius: PLAYER.bulletRadius,
          damage: PLAYER.bulletDamage,
          life: 1.1,
          active: true,
        });
      }
      effects.sparkle(p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22, '#ffe9a8');
      audio.shoot();
    }
  }

  function stepEnemies(dt, effects, audio) {
    const p = state.player;
    for (const enemy of state.enemies) {
      if (!enemy.active || enemy.dead) continue;
      const action = updateEnemy(enemy, dt, p, random);
      if (action === 'shoot') {
        const orb = spitterOrb(enemy, p);
        state.orbs.push(orb);
        effects.sparkle(enemy.x, enemy.y, '#ff7ad9');
      } else if (action === 'burst') {
        for (const orb of wardenBurst(enemy)) state.orbs.push(orb);
        effects.ring(enemy.x, enemy.y, '#ffb347', 200, 0.6);
        audio.bossRoar();
      } else if (action === 'spawn') {
        const at = edgeSpawn(random);
        state.enemies.push(createEnemy(KIND_WISP, at.x, at.y, state.wave));
        effects.ring(at.x, at.y, '#b78cff', 90, 0.4);
      }
    }
  }

  function stepProjectiles(dt) {
    for (const b of state.bullets) {
      if (!b.active) continue;
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) b.active = false;
    }
    for (const o of state.orbs) {
      if (!o.active) continue;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (o.x < -30 || o.x > FIELD.width + 30 || o.y < -30 || o.y > FIELD.height + 30) o.active = false;
    }
    state.bullets = state.bullets.filter((b) => b.active);
    state.orbs = state.orbs.filter((o) => o.active);
  }

  function stepPickups(dt, effects, audio) {
    const p = state.player;
    for (const ember of state.embers) {
      if (!ember.active) continue;
      ember.life -= dt;
      if (ember.life <= 0) {
        ember.active = false;
        continue;
      }
      const dx = p.x - ember.x;
      const dy = p.y - ember.y;
      const dist = Math.hypot(dx, dy) || 1;
      const pull = p.magnet > 0 ? EMBER.magnetRadius : 90;
      if (dist < pull) {
        const force = p.magnet > 0 ? 900 : 420;
        ember.vx += (dx / dist) * force * dt;
        ember.vy += (dy / dist) * force * dt;
      } else {
        ember.vx *= Math.max(0, 1 - 1.6 * dt);
        ember.vy *= Math.max(0, 1 - 1.6 * dt);
      }
      ember.x += ember.vx * dt;
      ember.y += ember.vy * dt;
      if (dist < EMBER.collectRadius) {
        ember.active = false;
        p.light = Math.min(PLAYER.lightMax, p.light + PLAYER.lightPerEmber);
        state.score += EMBER.value;
        effects.sparkle(ember.x, ember.y, '#ffb347');
        audio.ember();
      }
    }
    state.embers = state.embers.filter((e) => e.active);
    for (const up of state.powerups) {
      if (!up.active) continue;
      up.life -= dt;
      up.bob += dt * 3;
      if (up.life <= 0) {
        up.active = false;
        continue;
      }
      const dx = p.x - up.x;
      const dy = p.y - up.y;
      if (Math.hypot(dx, dy) < 30) {
        up.active = false;
        if (up.kind === 'spread') p.spread = POWERUP.spread.duration;
        if (up.kind === 'rapid') p.rapid = POWERUP.rapid.duration;
        if (up.kind === 'aegis') p.aegis = POWERUP.aegis.duration;
        if (up.kind === 'magnet') p.magnet = POWERUP.magnet.duration;
        effects.ring(p.x, p.y, '#7dffce', 110, 0.5);
        effects.floatText(p.x, p.y - 28, up.kind.toUpperCase(), '#7dffce', 16);
        audio.powerup();
      }
    }
    state.powerups = state.powerups.filter((u) => u.active);
  }

  function stepCollisions(effects, audio) {
    const p = state.player;
    let events = EVENT_NONE;
    // Bullets against enemies.
    for (const b of state.bullets) {
      if (!b.active) continue;
      for (const enemy of state.enemies) {
        if (!enemy.active || enemy.dead) continue;
        const dx = enemy.x - b.x;
        const dy = enemy.y - b.y;
        const rr = enemy.radius + b.radius;
        if (dx * dx + dy * dy < rr * rr) {
          b.active = false;
          enemy.hull -= b.damage;
          enemy.flash = 1;
          effects.burst(b.x, b.y, enemy.color, 3, 140, 0.3, 2);
          if (enemy.hull <= 0) {
            killEnemy(enemy, effects, audio);
            events |= EVENT_KILL;
          }
          break;
        }
      }
    }
    state.bullets = state.bullets.filter((b) => b.active);
    state.enemies = state.enemies.filter((e) => !e.dead);
    // Enemy orbs against the player.
    for (const o of state.orbs) {
      if (!o.active) continue;
      const dx = p.x - o.x;
      const dy = p.y - o.y;
      const rr = PLAYER.radius + o.radius;
      if (dx * dx + dy * dy < rr * rr) {
        o.active = false;
        if (damagePlayer(ORB.damage, effects, audio)) events |= EVENT_HIT;
      }
    }
    state.orbs = state.orbs.filter((o) => o.active);
    // Touching an enemy hurts.
    for (const enemy of state.enemies) {
      if (!enemy.active) continue;
      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const rr = PLAYER.radius + enemy.radius - 4;
      if (dx * dx + dy * dy < rr * rr) {
        if (damagePlayer(enemy.touch, effects, audio)) events |= EVENT_HIT;
        // Shove the enemy back so it cannot sit on the player.
        const dist = Math.hypot(dx, dy) || 1;
        enemy.x -= (dx / dist) * 26;
        enemy.y -= (dy / dist) * 26;
      }
    }
    return events;
  }

  function stepSpawning(dt) {
    if (state.waveState !== 'fight') return;
    if (spawnQueue.length > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTimer = Math.max(0.35, 1.0 - state.wave * 0.05);
        spawnEnemy(spawnQueue.shift());
      }
    } else if (state.wave >= FINAL_WAVE) {
      // The Warden calls wisps while it lives.
      const wardenAlive = state.enemies.some((e) => e.kind === KIND_WARDEN);
      const wisps = state.enemies.filter((e) => e.kind === KIND_WISP).length;
      if (wardenAlive && wisps < 4) {
        wispTrickle -= dt;
        if (wispTrickle <= 0) {
          wispTrickle = 5;
          spawnEnemy(KIND_WISP);
        }
      }
    }
  }

  function checkWaveEnd(effects, audio) {
    if (state.waveState !== 'fight') return EVENT_NONE;
    if (spawnQueue.length > 0 || state.enemies.length > 0) return EVENT_NONE;
    if (state.wave >= FINAL_WAVE) {
      state.waveState = 'won';
      state.banner = 'THE STAR BURNS AGAIN';
      state.bannerTimer = 3;
      return EVENT_WIN;
    }
    const bonus = WAVE_CLEAR.bonus * state.wave;
    state.score += bonus;
    state.waveState = 'clear';
    clearTimer = 2.6;
    state.banner = `WAVE ${state.wave} CLEAR  +${bonus}`;
    state.bannerTimer = 2.4;
    dropEmbers(state.player.x, state.player.y, WAVE_CLEAR.embers, false);
    if (state.wave % WAVE_CLEAR.healHullEvery === 0 && state.player.hull < PLAYER.hull) {
      state.player.hull += 1;
      effects.floatText(state.player.x, state.player.y - 34, '+1 HULL', '#7dffce', 18);
    }
    audio.waveHorn();
    return EVENT_WAVE_CLEAR;
  }

  /**
   * Advance the world one fixed step. `input` steers the player; `attract` runs the
   * title backdrop (drifting wisps, no damage, no score). Returns an event bitmask.
   */
  function step(dt, input, effects, audio, attract = false) {
    state.time += dt;
    state.bannerTimer = Math.max(0, state.bannerTimer - dt);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    if (attract) {
      if (state.enemies.length < 7 && Math.random() < dt * 0.7) spawnEnemy(KIND_WISP);
      for (const enemy of state.enemies) updateEnemy(enemy, dt, state.player, random);
      return EVENT_NONE;
    }

    let events = EVENT_NONE;
    stepPlayer(dt, input, effects, audio);
    stepEnemies(dt, effects, audio);
    stepProjectiles(dt);
    stepPickups(dt, effects, audio);
    events |= stepCollisions(effects, audio);
    stepSpawning(dt);

    if (state.waveState === 'clear') {
      clearTimer -= dt;
      if (clearTimer <= 0) startWave(state.wave + 1);
    } else {
      events |= checkWaveEnd(effects, audio);
    }

    if (state.player.hull <= 0) {
      state.waveState = 'over';
      events |= EVENT_OVER;
    }
    return events;
  }

  return {
    state,
    reset,
    startWave,
    step,
    get enemiesLeft() {
      return spawnQueue.length + state.enemies.length;
    },
  };
}

export { STEP };
