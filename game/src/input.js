// Emberfall — keyboard and mouse in one place. WASD or arrows move, the mouse aims,
// hold left mouse or Space to fire, Shift or right mouse dashes, P or Esc pauses,
// M mutes, R restarts from an end screen, Enter or click confirms on menus.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mouseClicked = false;
  let clickX = 0;
  let clickY = 0;

  const GAME_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];

  function keyDown(event) {
    if (GAME_KEYS.includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyR') actions |= ACTION_RESTART;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
  }

  function keyUp(event) {
    keys.delete(event.code);
  }

  function mouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  }

  function mouseDownHandler(event) {
    mouseMove(event);
    if (event.button === 0) {
      mouseDown = true;
      mouseClicked = true;
      clickX = mouseX;
      clickY = mouseY;
    }
  }

  function mouseUpHandler(event) {
    if (event.button === 0) mouseDown = false;
  }

  function blur() {
    keys.clear();
    mouseDown = false;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', blur);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mousedown', mouseDownHandler);
  window.addEventListener('mouseup', mouseUpHandler);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** Movement direction, normalised, from WASD or the arrow keys. */
    move() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        x *= Math.SQRT1_2;
        y *= Math.SQRT1_2;
      }
      return { x, y };
    },
    /** Aim direction from the player toward the mouse, in field coordinates. */
    aim(playerX, playerY, scale, offsetX, offsetY) {
      const fx = (mouseX - offsetX) / scale;
      const fy = (mouseY - offsetY) / scale;
      const dx = fx - playerX;
      const dy = fy - playerY;
      const len = Math.hypot(dx, dy) || 1;
      return { x: dx / len, y: dy / len, angle: Math.atan2(dy, dx) };
    },
    get firing() {
      return mouseDown || keys.has('Space');
    },
    get dashing() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    /** One-shot actions since the last read; reading clears them. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** One-shot click since the last read, in canvas pixels, or null. */
    takeClick() {
      if (!mouseClicked) return null;
      mouseClicked = false;
      return { x: clickX, y: clickY };
    },
    get mouse() {
      return { x: mouseX, y: mouseY };
    },
  };
}
