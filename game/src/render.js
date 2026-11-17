// Emberfall — everything the player sees: the drowned-violet night, the lantern
// glow, the HUD and every screen. The renderer only paints state; it never
// changes it. The field is 1280x720 logical, scaled to the window.
import { FIELD, FONT, PALETTE, PLAYER } from './config.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const STAR_SEED = 1337;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHeart(ctx, x, y, size, filled) {
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.35);
  ctx.bezierCurveTo(x - size, y - size * 0.5, x - size * 0.45, y - size * 1.1, x, y - size * 0.35);
  ctx.bezierCurveTo(x + size * 0.45, y - size * 1.1, x + size, y - size * 0.5, x, y + size * 0.35);
  ctx.closePath();
  ctx.fillStyle = filled ? '#ff5a6e' : 'rgba(255, 90, 110, 0.18)';
  ctx.fill();
  if (filled) {
    ctx.strokeStyle = '#ff8fa0';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const starRandom = createRandom(STAR_SEED);
  const stars = [];
  for (let i = 0; i < 150; i += 1) {
    stars.push({
      x: starRandom.range(0, FIELD.width),
      y: starRandom.range(0, FIELD.height),
      r: starRandom.range(0.6, 2.2),
      tw: starRandom.range(0, Math.PI * 2),
      sp: starRandom.range(0.6, 2.4),
    });
  }
  const nebulae = [
    { x: 240, y: 150, r: 320, color: 'rgba(88, 40, 160, 0.30)' },
    { x: 1050, y: 120, r: 280, color: 'rgba(20, 90, 120, 0.26)' },
    { x: 980, y: 600, r: 340, color: 'rgba(140, 30, 90, 0.22)' },
    { x: 180, y: 590, r: 260, color: 'rgba(60, 30, 140, 0.24)' },
    { x: 640, y: 360, r: 420, color: 'rgba(40, 20, 90, 0.18)' },
  ];

  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let buttons = [];

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    scale = Math.min(w / FIELD.width, h / FIELD.height);
    offsetX = (w - FIELD.width * scale) / 2;
    offsetY = (h - FIELD.height * scale) / 2;
    return { scale, offsetX, offsetY, dpr };
  }

  function drawBackground(time) {
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, '#0b0722');
    grad.addColorStop(0.55, PALETTE.backdrop);
    grad.addColorStop(1, '#0d0718');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const n of nebulae) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    // Faint grid, drifting slowly.
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gridOff = (time * 6) % 64;
    for (let x = -64 + gridOff; x <= FIELD.width; x += 64) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FIELD.height);
    }
    for (let y = -64 + gridOff; y <= FIELD.height; y += 64) {
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD.width, y);
    }
    ctx.stroke();
    // Twinkling stars.
    for (const s of stars) {
      const a = 0.35 + 0.55 * Math.abs(Math.sin(time * s.sp + s.tw));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#cdd7ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawEmber(ctx2, x, y, r, time) {
    const flick = 0.75 + 0.25 * Math.sin(time * 6 + x * 0.05 + y * 0.05);
    const g = ctx2.createRadialGradient(x, y, 0, x, y, r * 3);
    g.addColorStop(0, 'rgba(255, 200, 90, 0.85)');
    g.addColorStop(0.4, 'rgba(255, 160, 60, 0.35)');
    g.addColorStop(1, 'rgba(255, 160, 60, 0)');
    ctx2.fillStyle = g;
    ctx2.beginPath();
    ctx2.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.globalAlpha = flick;
    ctx2.fillStyle = PALETTE.emberCore;
    ctx2.save();
    ctx2.translate(x, y);
    ctx2.rotate(Math.PI / 4);
    ctx2.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
    ctx2.restore();
    ctx2.globalAlpha = 1;
  }

  function drawEnemy(e, time) {
    const flash = e.flash > 0;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.globalAlpha = 1;
    if (e.kind === 'wisp') {
      // A ghostly flame with a trailing tail.
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, e.radius * 2.2);
      g.addColorStop(0, 'rgba(183, 140, 255, 0.55)');
      g.addColorStop(1, 'rgba(183, 140, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(e.angle);
      ctx.fillStyle = flash ? '#ffffff' : '#b78cff';
      ctx.beginPath();
      ctx.moveTo(e.radius, 0);
      ctx.quadraticCurveTo(0, -e.radius, -e.radius * 0.9, 0);
      ctx.quadraticCurveTo(0, e.radius, e.radius, 0);
      ctx.fill();
      ctx.fillStyle = '#efe6ff';
      ctx.beginPath();
      ctx.arc(e.radius * 0.25, -e.radius * 0.2, e.radius * 0.22, 0, Math.PI * 2);
      ctx.arc(e.radius * 0.25, e.radius * 0.2, e.radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'spitter') {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, e.radius * 2);
      g.addColorStop(0, 'rgba(255, 122, 217, 0.4)');
      g.addColorStop(1, 'rgba(255, 122, 217, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(e.angle);
      ctx.fillStyle = flash ? '#ffffff' : '#ff7ad9';
      ctx.beginPath();
      ctx.moveTo(e.radius * 1.2, 0);
      ctx.lineTo(0, -e.radius * 0.9);
      ctx.lineTo(-e.radius * 1.2, 0);
      ctx.lineTo(0, e.radius * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2a0a22';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd7f2';
      ctx.beginPath();
      ctx.arc(e.radius * 0.12, 0, e.radius * 0.16, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'brute') {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, e.radius * 1.8);
      g.addColorStop(0, 'rgba(255, 90, 78, 0.4)');
      g.addColorStop(1, 'rgba(255, 90, 78, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(e.angle);
      ctx.fillStyle = flash ? '#ffffff' : '#c22e28';
      ctx.strokeStyle = '#ff8a7a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * e.radius;
        const py = Math.sin(a) * e.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff5a4e';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.42, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'splitter') {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, e.radius * 2);
      g.addColorStop(0, 'rgba(125, 255, 206, 0.4)');
      g.addColorStop(1, 'rgba(125, 255, 206, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = flash ? '#ffffff' : '#2fbf8f';
      ctx.beginPath();
      ctx.arc(-e.radius * 0.42, 0, e.radius * 0.62, 0, Math.PI * 2);
      ctx.arc(e.radius * 0.42, 0, e.radius * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d9fff0';
      ctx.beginPath();
      ctx.arc(-e.radius * 0.42, -e.radius * 0.15, e.radius * 0.16, 0, Math.PI * 2);
      ctx.arc(e.radius * 0.42, -e.radius * 0.15, e.radius * 0.16, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'warden') {
      // The Warden: a burning crowned sun.
      const pulse = 1 + 0.04 * Math.sin(time * 3);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, e.radius * 2.4);
      g.addColorStop(0, 'rgba(255, 179, 71, 0.5)');
      g.addColorStop(1, 'rgba(255, 90, 40, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(e.angle);
      ctx.fillStyle = '#ffb347';
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(e.radius * 0.95, -e.radius * 0.16);
        ctx.lineTo(e.radius * 1.45 * pulse, 0);
        ctx.lineTo(e.radius * 0.95, e.radius * 0.16);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = flash ? '#ffffff' : '#e2541e';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd28a';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#3a0d00';
      ctx.beginPath();
      ctx.arc(-e.radius * 0.28, -e.radius * 0.15, e.radius * 0.13, 0, Math.PI * 2);
      ctx.arc(e.radius * 0.28, -e.radius * 0.15, e.radius * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a0d00';
      ctx.fillRect(-e.radius * 0.45, e.radius * 0.3, e.radius * 0.9, e.radius * 0.1);
    }
    ctx.restore();
    // Health bar for the tough kinds.
    if ((e.kind === 'brute' || e.kind === 'warden') && e.hull < e.maxHull) {
      const w = e.kind === 'warden' ? 150 : 52;
      const y = e.y - e.radius - 14;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(e.x - w / 2, y, w, 6);
      ctx.fillStyle = e.kind === 'warden' ? '#ffb347' : '#ff5a4e';
      ctx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hull / e.maxHull), 6);
    }
  }

  function drawPlayer(p, time) {
    const blink = p.invulnerable > 0 && Math.floor(time * 14) % 2 === 0;
    ctx.save();
    ctx.translate(p.x, p.y);
    // Lantern glow.
    const glowR = 90 + 14 * Math.sin(time * 4);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
    g.addColorStop(0, 'rgba(255, 210, 110, 0.5)');
    g.addColorStop(0.45, 'rgba(127, 231, 255, 0.22)');
    g.addColorStop(1, 'rgba(127, 231, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();
    if (p.aegis > 0) {
      ctx.strokeStyle = `rgba(127, 231, 255, ${0.5 + 0.3 * Math.sin(time * 6)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER.radius + 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = blink ? 0.35 : 1;
    ctx.rotate(p.angle);
    // Hull: a sleek arrowhead ship.
    ctx.fillStyle = '#12303f';
    ctx.strokeStyle = PALETTE.player;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-12, -13);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Cockpit lantern.
    ctx.fillStyle = PALETTE.playerCore;
    ctx.beginPath();
    ctx.arc(4, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(4, 0, 2.8, 0, Math.PI * 2);
    ctx.fill();
    // Aim tick.
    ctx.strokeStyle = 'rgba(255, 233, 168, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.lineTo(34, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawPowerup(up, time) {
    const colors = { spread: '#ff7ad9', rapid: '#ffe9a8', aegis: '#7fe7ff', magnet: '#ffb347' };
    const letters = { spread: 'S', rapid: 'R', aegis: 'A', magnet: 'M' };
    const bobY = up.y + Math.sin(up.bob) * 4;
    const color = colors[up.kind] ?? '#ffffff';
    ctx.save();
    ctx.translate(up.x, bobY);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(10, 8, 26, 0.9)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letters[up.kind] ?? '?', 0, 1);
    ctx.restore();
  }

  /** The dark that closes in as the lantern burns down. */
  function drawDarkness(state) {
    const p = state.player;
    const lightFrac = p.light / PLAYER.lightMax;
    const radius = 210 + lightFrac * 250;
    const g = ctx.createRadialGradient(p.x, p.y, radius * 0.45, p.x, p.y, radius * 1.9);
    g.addColorStop(0, 'rgba(4, 3, 12, 0)');
    g.addColorStop(0.55, 'rgba(4, 3, 12, 0.22)');
    g.addColorStop(1, 'rgba(4, 3, 12, 0.88)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (state.fading) {
      const pulse = 0.12 + 0.08 * Math.sin(state.time * 8);
      ctx.fillStyle = `rgba(255, 40, 40, ${pulse})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  function drawHud(state, best, enemiesLeft) {
    const p = state.player;
    // Top-left panel: hull hearts and the light bar.
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1;
    roundRect(ctx, 16, 14, 250, 64, 10);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < PLAYER.hull; i += 1) drawHeart(ctx, 40 + i * 30, 38, 11, i < p.hull);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('LIGHT', 24, 70);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    roundRect(ctx, 70, 60, 180, 10, 5);
    ctx.fill();
    const lightFrac = Math.max(0, p.light / PLAYER.lightMax);
    const lg = ctx.createLinearGradient(70, 0, 250, 0);
    lg.addColorStop(0, '#ff9a3d');
    lg.addColorStop(1, '#ffcf5c');
    ctx.fillStyle = lightFrac < 0.25 ? '#ff5a4e' : lg;
    if (lightFrac > 0) {
      roundRect(ctx, 70, 60, 180 * lightFrac, 10, 5);
      ctx.fill();
    }
    // Top-centre: wave and foes left.
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = PALETTE.panelEdge;
    roundRect(ctx, FIELD.width / 2 - 130, 14, 260, 48, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(state.waveState === 'title' ? 'EMBERFALL' : `WAVE ${Math.max(1, state.wave)} / 10`, FIELD.width / 2, 34);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(state.waveState === 'fight' ? `${enemiesLeft} foes remain` : state.waveState === 'clear' ? 'wave clear' : 'survive the night', FIELD.width / 2, 53);
    // Top-right: score, combo, best.
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = PALETTE.panelEdge;
    roundRect(ctx, FIELD.width - 266, 14, 250, 64, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(state.score.toLocaleString('en-US'), FIELD.width - 28, 40);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `12px ${FONT}`;
    ctx.fillText(`BEST ${Math.max(best, state.score).toLocaleString('en-US')}`, FIELD.width - 28, 58);
    if (state.combo >= 4) {
      const mult = Math.min(8, 1 + Math.floor(state.combo / 4));
      ctx.fillStyle = '#ffcf5c';
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(`COMBO x${mult}  (${state.combo})`, FIELD.width - 256, 70);
    }
    // Bottom-left: dash cooldown.
    const dashFrac = Math.min(1, 1 - Math.max(0, p.dashCooldown) / 1.6);
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, 16, FIELD.height - 44, 150, 28, 8);
    ctx.fill();
    ctx.fillStyle = dashFrac >= 1 ? '#7fe7ff' : 'rgba(127,231,255,0.35)';
    roundRect(ctx, 20, FIELD.height - 38, 92 * dashFrac, 16, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 12px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(dashFrac >= 1 ? 'DASH READY' : 'DASH…', 118, FIELD.height - 25);
    // Bottom-right: active power-ups.
    const actives = [];
    if (p.spread > 0) actives.push(['SPREAD', p.spread]);
    if (p.rapid > 0) actives.push(['RAPID', p.rapid]);
    if (p.aegis > 0) actives.push(['AEGIS', p.aegis]);
    if (p.magnet > 0) actives.push(['MAGNET', p.magnet]);
    actives.forEach(([name, t], i) => {
      const x = FIELD.width - 26 - i * 118;
      ctx.fillStyle = PALETTE.panel;
      roundRect(ctx, x - 104, FIELD.height - 44, 104, 28, 8);
      ctx.fill();
      ctx.fillStyle = '#7dffce';
      ctx.font = `bold 12px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(`${name} ${Math.ceil(t)}s`, x - 12, FIELD.height - 25);
    });
    // Mute hint.
    ctx.fillStyle = 'rgba(157, 148, 196, 0.8)';
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('M — sound on/off', 16, FIELD.height - 52);
  }

  function drawBanner(state) {
    if (state.bannerTimer <= 0 || !state.banner) return;
    const t = state.bannerTimer;
    const alpha = Math.min(1, t / 0.6);
    const scaleIn = 1 + Math.max(0, (t - 1.9)) * 0.12;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(FIELD.width / 2, 190);
    ctx.scale(scaleIn, scaleIn);
    ctx.font = `bold 52px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 179, 71, 0.8)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(state.banner, 0, 0);
    ctx.restore();
  }

  function drawButton(label, x, y, w, h, primary) {
    ctx.fillStyle = primary ? '#ffcf5c' : 'rgba(255,255,255,0.08)';
    ctx.strokeStyle = primary ? '#ffe9a8' : PALETTE.panelEdge;
    ctx.lineWidth = primary ? 2 : 1.5;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = primary ? '#241505' : PALETTE.text;
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    buttons.push({ id: label, x, y, w, h });
  }

  function drawPanel(x, y, w, h) {
    ctx.fillStyle = 'rgba(7, 6, 15, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.stroke();
  }

  function drawTitle(state, best, bestWave) {
    drawPanel(FIELD.width / 2 - 340, 108, 680, 480);
    // Logo.
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 179, 71, 0.9)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ffcf5c';
    ctx.font = `bold 74px ${FONT}`;
    ctx.fillText('EMBERFALL', FIELD.width / 2, 200);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.player;
    ctx.font = `bold 19px ${FONT}`;
    ctx.fillText('— LAST LIGHT OF THE HOLLOW STAR —', FIELD.width / 2, 232);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `17px ${FONT}`;
    ctx.fillText('Your lantern is the only light left. Feed it embers,', FIELD.width / 2, 282);
    ctx.fillText('hold back the dark for ten waves, and burn the Warden down.', FIELD.width / 2, 306);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText('WASD / arrows — fly      Mouse — aim      Hold click / Space — fire', FIELD.width / 2, 348);
    ctx.fillText('Shift — dash      P — pause      M — sound', FIELD.width / 2, 372);
    ctx.fillText('Embers restore your light. Light at zero and the dark eats your hull.', FIELD.width / 2, 396);
    if (best > 0) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillText(`BEST  ${best.toLocaleString('en-US')}   ·   WAVE ${bestWave}`, FIELD.width / 2, 432);
    }
    drawButton('LIGHT THE LANTERN', FIELD.width / 2 - 150, 462, 300, 54, true);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText('or press Enter', FIELD.width / 2, 548);
  }

  function drawPaused() {
    drawPanel(FIELD.width / 2 - 260, 220, 520, 260);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 44px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', FIELD.width / 2, 300);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT}`;
    ctx.fillText('The dark waits patiently.', FIELD.width / 2, 336);
    drawButton('RESUME', FIELD.width / 2 - 110, 372, 220, 50, true);
  }

  function drawOver(state, best, isWin) {
    drawPanel(FIELD.width / 2 - 320, 130, 640, 440);
    ctx.textAlign = 'center';
    ctx.shadowColor = isWin ? 'rgba(255, 207, 92, 0.9)' : 'rgba(255, 90, 78, 0.8)';
    ctx.shadowBlur = 26;
    ctx.fillStyle = isWin ? '#ffcf5c' : '#ff5a4e';
    ctx.font = `bold 56px ${FONT}`;
    ctx.fillText(isWin ? 'THE STAR BURNS AGAIN' : 'THE LIGHT GOES OUT', FIELD.width / 2, 210);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.text;
    ctx.font = `18px ${FONT}`;
    ctx.fillText(isWin
      ? 'The Warden is ash. Dawn returns to the Hollow Star.'
      : 'The dark keeps what it takes — but the lantern can be lit again.', FIELD.width / 2, 250);
    const rows = [
      ['SCORE', state.score.toLocaleString('en-US')],
      ['BEST', Math.max(best, state.score).toLocaleString('en-US')],
      ['WAVE REACHED', String(Math.max(1, state.wave))],
      ['FOES BURNED', String(state.kills)],
      ['BEST COMBO', `x${Math.min(8, 1 + Math.floor(state.comboBest / 4))}  (${state.comboBest} kills)`],
      ['TIME', `${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`],
    ];
    ctx.font = `17px ${FONT}`;
    rows.forEach(([label, value], i) => {
      const y = 292 + i * 30;
      ctx.fillStyle = PALETTE.muted;
      ctx.textAlign = 'left';
      ctx.fillText(label, FIELD.width / 2 - 210, y);
      ctx.fillStyle = PALETTE.text;
      ctx.textAlign = 'right';
      ctx.fillText(value, FIELD.width / 2 + 210, y);
    });
    drawButton('FLY AGAIN  (R)', FIELD.width / 2 - 140, 486, 280, 52, true);
  }

  return {
    resize,
    get scale() {
      return scale;
    },
    get offsetX() {
      return offsetX;
    },
    get offsetY() {
      return offsetY;
    },
    /** Which menu button, if any, sits under field coordinates (x, y). */
    hitButton(x, y) {
      for (const b of buttons) {
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
      }
      return null;
    },
    draw(state, screen, best, bestWave, enemiesLeft, effects) {
      buttons = [];
      const { dpr } = resize();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = PALETTE.backdrop;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      const shake = effects.shakeOffset();
      ctx.save();
      ctx.translate(offsetX + shake.x * scale, offsetY + shake.y * scale);
      ctx.scale(scale, scale);
      ctx.textBaseline = 'alphabetic';

      drawBackground(state.time);
      const time = state.time;
      for (const up of state.powerups) drawPowerup(up, time);
      for (const ember of state.embers) drawEmber(ctx, ember.x, ember.y, 6, time);
      for (const enemy of state.enemies) drawEnemy(enemy, time);
      // Enemy orbs.
      for (const o of state.orbs) {
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.radius * 2.4);
        g.addColorStop(0, 'rgba(255, 122, 217, 0.9)');
        g.addColorStop(1, 'rgba(255, 122, 217, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius * 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd7f2';
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      // Player bullets.
      ctx.globalCompositeOperation = 'lighter';
      for (const b of state.bullets) {
        ctx.strokeStyle = '#ffe9a8';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x - b.vx * 0.022, b.y - b.vy * 0.022);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      if (screen !== SCREEN_TITLE) drawPlayer(state.player, time);
      else {
        // Title keeps the ship parked in the middle, lantern lit.
        drawPlayer({ ...state.player, x: FIELD.width / 2, y: 470, angle: -Math.PI / 2, invulnerable: 0, aegis: 0, thrust: 0 }, time);
      }
      drawDarkness(state);
      // Glow pass: particles and floating text shine through the dark.
      ctx.globalCompositeOperation = 'lighter';
      effects.draw(ctx);
      ctx.globalCompositeOperation = 'source-over';

      if (effects.flash > 0) {
        ctx.fillStyle = `rgba(255, 60, 50, ${effects.flash * 0.55})`;
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      }

      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
        drawHud(state, best, enemiesLeft);
        drawBanner(state);
      }
      if (screen === SCREEN_TITLE) drawTitle(state, best, bestWave);
      if (screen === SCREEN_PAUSED) drawPaused();
      if (screen === SCREEN_OVER) drawOver(state, best, false);
      if (screen === SCREEN_WIN) drawOver(state, best, true);
      ctx.restore();
    },
  };
}
