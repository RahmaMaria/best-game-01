// Emberfall — the juice: pooled particles, expanding shockwave rings and floating
// score text. One pool per effect, allocated once, reused every frame; nothing
// here allocates during play.
import { POOL } from './config.js';

export function createEffects() {
  const particles = [];
  for (let i = 0; i < POOL.particles; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', drag: 0, glow: true });
  }
  const rings = [];
  for (let i = 0; i < 16; i += 1) rings.push({ active: false, x: 0, y: 0, radius: 0, maxRadius: 100, life: 0, maxLife: 1, color: '#fff', width: 3 });
  const texts = [];
  for (let i = 0; i < POOL.texts; i += 1) {
    texts.push({ active: false, x: 0, y: 0, life: 0, maxLife: 1, str: '', color: '#fff', size: 16 });
  }
  let shake = 0;
  let hitStop = 0;
  let flash = 0;

  function spawnParticle(x, y, vx, vy, life, size, color, drag = 2.5) {
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.maxLife = life;
      p.size = size;
      p.color = color;
      p.drag = drag;
      return;
    }
  }

  return {
    /** A burst of sparks flying out from a point. */
    burst(x, y, color, count, speed = 260, life = 0.6, size = 3) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const v = speed * (0.3 + Math.random() * 0.7);
        spawnParticle(x, y, Math.cos(angle) * v, Math.sin(angle) * v, life * (0.6 + Math.random() * 0.7), size * (0.6 + Math.random() * 0.8), color);
      }
    },
    /** A soft ember sparkle that drifts upward and fades. */
    sparkle(x, y, color) {
      spawnParticle(x, y, (Math.random() - 0.5) * 40, -30 - Math.random() * 50, 0.9, 2, color, 0.5);
    },
    /** Engine trail behind the moving ship. */
    trail(x, y, color) {
      spawnParticle(x, y, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, 0.35, 2.5, color, 1);
    },
    ring(x, y, color, maxRadius = 120, life = 0.5, width = 3) {
      for (let i = 0; i < rings.length; i += 1) {
        const r = rings[i];
        if (r.active) continue;
        r.active = true;
        r.x = x;
        r.y = y;
        r.radius = 6;
        r.maxRadius = maxRadius;
        r.life = life;
        r.maxLife = life;
        r.color = color;
        r.width = width;
        return;
      }
    },
    floatText(x, y, str, color, size = 16) {
      for (let i = 0; i < texts.length; i += 1) {
        const t = texts[i];
        if (t.active) continue;
        t.active = true;
        t.x = x;
        t.y = y;
        t.life = 1.0;
        t.maxLife = 1.0;
        t.str = str;
        t.color = color;
        t.size = size;
        return;
      }
    },
    addShake(amount) {
      shake = Math.min(18, shake + amount);
    },
    addHitStop(seconds) {
      hitStop = Math.max(hitStop, seconds);
    },
    addFlash(amount) {
      flash = Math.min(0.6, flash + amount);
    },
    get hitStop() {
      return hitStop;
    },
    step(dt) {
      if (hitStop > 0) hitStop -= dt;
      shake = Math.max(0, shake - dt * 34);
      flash = Math.max(0, flash - dt * 1.8);
      for (const p of particles) {
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        const drag = Math.max(0, 1 - p.drag * dt);
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (const r of rings) {
        if (!r.active) continue;
        r.life -= dt;
        if (r.life <= 0) {
          r.active = false;
          continue;
        }
        const t = 1 - r.life / r.maxLife;
        r.radius = 6 + (r.maxRadius - 6) * (1 - (1 - t) * (1 - t));
      }
      for (const t of texts) {
        if (!t.active) continue;
        t.life -= dt;
        if (t.life <= 0) {
          t.active = false;
          continue;
        }
        t.y -= 42 * dt;
      }
    },
    /** Current shake offset, applied to the whole scene by the renderer. */
    shakeOffset() {
      if (shake <= 0.2) return { x: 0, y: 0 };
      return { x: (Math.random() - 0.5) * shake, y: (Math.random() - 0.5) * shake };
    },
    get flash() {
      return flash;
    },
    draw(ctx) {
      for (const p of particles) {
        if (!p.active) continue;
        const a = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const r of rings) {
        if (!r.active) continue;
        const a = Math.max(0, r.life / r.maxLife);
        ctx.globalAlpha = a * 0.9;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.width * a + 0.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const t of texts) {
        if (!t.active) continue;
        const a = Math.max(0, t.life / t.maxLife);
        ctx.globalAlpha = Math.min(1, a * 1.6);
        ctx.fillStyle = t.color;
        ctx.font = `bold ${t.size}px ${'Trebuchet MS, sans-serif'}`;
        ctx.textAlign = 'center';
        ctx.fillText(t.str, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },
  };
}
