/**
 * Input.js — teclado + mouse + gamepad + toque, unificados.
 * API: input.axis() (movimento), input.aim() (mira), input.pressed(action).
 * Acoes: fire, secondary, dash, interact, pause, confirm, cancel.
 */
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', KeyD: 'right', KeyE: 'interact', Space: 'dash',
  ShiftLeft: 'dash', ShiftRight: 'dash', Escape: 'pause', KeyP: 'pause',
  Enter: 'confirm', NumpadEnter: 'confirm', KeyZ: 'undo', Tab: 'map',
  Digit1: 'slot1', Digit2: 'slot2',
};
const GP_BUTTON = { 0: 'fire', 1: 'secondary', 2: 'interact', 3: 'dash', 5: 'secondary', 7: 'dash', 9: 'pause', 4: 'interact' };

export class Input {
  constructor(canvas, touch = null) {
    this.canvas = canvas;
    this.touch = touch;
    this.keys = new Set();
    this.justKeys = new Set();
    this.mouse = { x: 0, y: 0, down: false, justDown: false };
    this.pad = null;
    this.padButtons = new Set();
    this.padJust = new Set();
    this.usingPad = false;
    this.stick = { x: 0, y: 0 };
    this.lastInputDevice = 'key';
    this.anyKey = false;
    this._bind();
  }

  _bind() {
    const c = this.canvas;
    addEventListener('keydown', e => {
      if (e.code === 'Tab' || e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      this.justKeys.add(e.code);
      this.anyKey = true;
      this.lastInputDevice = 'key';
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouse.down = false; });

    const toWorld = ev => {
      const r = c.getBoundingClientRect();
      this.mouse.x = ((ev.clientX - r.left) / r.width) * c.width;
      this.mouse.y = ((ev.clientY - r.top) / r.height) * c.height;
    };
    c.addEventListener('mousemove', toWorld);
    c.addEventListener('mousedown', ev => { toWorld(ev); this.mouse.down = true; this.mouse.justDown = true; this.lastInputDevice = 'mouse'; });
    addEventListener('mouseup', () => { this.mouse.down = false; });
    c.addEventListener('contextmenu', e => e.preventDefault());

    addEventListener('gamepadconnected', e => { this.pad = e.gamepad; this.usingPad = true; });
    addEventListener('gamepaddisconnected', () => { this.pad = null; });
  }

  /** Deve ser chamado no fim de cada frame de simulacao. */
  endFrame() {
    this.justKeys.clear();
    this.mouse.justDown = false;
    this.padJust.clear();
    this.anyKey = false;
    if (this.touch) this.touch.endFrame();
  }

  pollPad() {
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    const gp = pads && pads.find(p => p && p.connected);
    if (!gp) { this.pad = null; return; }
    this.pad = gp;
    this.stick.x = Math.abs(gp.axes[0]) > 0.22 ? gp.axes[0] : 0;
    this.stick.y = Math.abs(gp.axes[1]) > 0.22 ? gp.axes[1] : 0;
    this.aimStick = { x: gp.axes[2] || 0, y: gp.axes[3] || 0 };
    for (let i = 0; i < gp.buttons.length; i++) {
      const pressed = gp.buttons[i].pressed || gp.buttons[i].value > 0.5;
      const action = GP_BUTTON[i];
      if (!action) continue;
      if (pressed && !this.padButtons.has(i)) { this.padJust.add(action); this.lastInputDevice = 'pad'; this.anyKey = true; }
      if (pressed) this.padButtons.add(i); else this.padButtons.delete(i);
    }
  }

  down(action) {
    for (const [code, a] of Object.entries(KEYMAP)) if (a === action && this.keys.has(code)) return true;
    if (this.pad) {
      for (const [idx, a] of Object.entries(GP_BUTTON)) {
        if (a === action && this.pad.buttons[idx] && (this.pad.buttons[idx].pressed || this.pad.buttons[idx].value > 0.5)) return true;
      }
    }
    if (this.touch) return this.touch.isDown(action);
    return false;
  }

  pressed(action) {
    for (const [code, a] of Object.entries(KEYMAP)) if (a === action && this.justKeys.has(code)) return true;
    if (this.padJust.has(action)) return true;
    if (this.touch && this.touch.justPressed(action)) return true;
    if (action === 'fire' && this.mouse.justDown) return true;
    if (action === 'confirm' && this.mouse.justDown) return true;
    return false;
  }

  /** Vetor de movimento normalizado (-1..1). */
  axis() {
    let x = 0, y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (this.touch && this.touch.move.active) { x = this.touch.move.x; y = this.touch.move.y; }
    if (this.pad && (this.stick.x || this.stick.y)) { x = this.stick.x; y = this.stick.y; }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y, len: Math.min(len, 1) };
  }

  /** Direcao de mira em coordenadas de TELA. */
  aim() {
    if (this.touch && this.touch.aim.active) return { x: this.touch.aim.x, y: this.touch.aim.y, source: 'touch' };
    if (this.pad && this.aimStick && Math.hypot(this.aimStick.x, this.aimStick.y) > 0.3) {
      return { x: this.aimStick.x, y: this.aimStick.y, source: 'pad' };
    }
    if (this.lastInputDevice === 'mouse' || this.mouse.down) {
      return { x: this.mouse.x, y: this.mouse.y, source: 'mouse' };
    }
    // setas: mira relativa ao movimento (twin-stick de teclado)
    const a = this.axis();
    if (a.len > 0.1) return { x: a.x, y: a.y, source: 'rel' };
    return null;
  }

  /** Direcao de mira por setas (absolute, sem mouse). */
  arrowAim() {
    let x = 0, y = 0;
    if (this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('ArrowDown')) y += 1;
    if (x || y) { const l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
    return null;
  }
}
