// Emberfall — every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below
// depends on the screen size. Palette: a drowned violet night, warm ember gold as
// the one light in it, cyan for the player's lantern-ship.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Waves in a full run; wave 10 is the Warden, and killing it wins the game. */
export const FINAL_WAVE = 10;

export const PLAYER = {
  radius: 14,
  speed: 340,
  accel: 2600,
  friction: 6.5,
  hull: 3,
  fireInterval: 0.16,
  bulletSpeed: 720,
  bulletRadius: 5,
  bulletDamage: 1,
  dashSpeed: 900,
  dashTime: 0.16,
  dashCooldown: 1.6,
  dashInvulnerable: 0.3,
  lightMax: 100,
  lightDrain: 1.1,
  lightPerEmber: 7,
  hitLightLoss: 22,
  invulnerable: 1.2,
};

export const ENEMY = {
  wisp: { radius: 15, speed: 135, hull: 2, score: 50, touch: 1, ember: 2, color: '#b78cff' },
  spitter: { radius: 17, speed: 95, hull: 3, score: 80, touch: 1, ember: 3, color: '#ff7ad9' },
  brute: { radius: 30, speed: 52, hull: 8, score: 150, touch: 1, ember: 5, color: '#ff5a4e' },
  splitter: { radius: 19, speed: 110, hull: 3, score: 100, touch: 1, ember: 3, color: '#7dffce' },
  warden: { radius: 64, speed: 46, hull: 90, score: 5000, touch: 2, ember: 24, color: '#ffb347' },
};

/** Enemy bullets (spitter orbs and the Warden's bursts). */
export const ORB = { radius: 7, speed: 210, damage: 1 };

/** Embers: the light the player collects. Small ones drift; a magnet pulls them in. */
export const EMBER = { radius: 6, value: 10, magnetRadius: 220, collectRadius: 26, life: 14 };

/** Power-ups dropped by fallen enemies. */
export const POWERUP = {
  spread: { life: 10, duration: 12 },
  rapid: { life: 10, duration: 12 },
  aegis: { life: 10, duration: 20 },
  magnet: { life: 10, duration: 10 },
  dropChance: 0.09,
};

/** Combo: each kill inside the window raises the multiplier by one step, to x8. */
export const COMBO = { window: 3.0, max: 8 };

/** Wave clear bonus and the ember shower that follows it. */
export const WAVE_CLEAR = { bonus: 250, embers: 10, healHullEvery: 3 };

/** How many things can exist at once; pools are allocated once, at boot. */
export const POOL = { bullets: 96, orbs: 96, embers: 160, particles: 420, texts: 32, powerups: 12 };

export const PALETTE = {
  backdrop: '#07060f',
  nebulaA: '#1b1040',
  nebulaB: '#3d1150',
  nebulaC: '#0a2a3d',
  grid: 'rgba(120, 90, 255, 0.07)',
  player: '#7fe7ff',
  playerCore: '#eafcff',
  bullet: '#ffe9a8',
  ember: '#ffb347',
  emberCore: '#fff3c4',
  text: '#f4f1ff',
  muted: '#9d94c4',
  gold: '#ffcf5c',
  danger: '#ff5a4e',
  panel: 'rgba(10, 8, 26, 0.82)',
  panelEdge: 'rgba(150, 120, 255, 0.35)',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const FONT_DISPLAY = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best score and best wave are kept between visits (this browser only). */
export const BEST_KEY = 'emberfall.best';
export const BEST_WAVE_KEY = 'emberfall.bestWave';
