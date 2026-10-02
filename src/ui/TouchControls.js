/**
 * TouchControls.js — controles de toque em DOM overlay (nao atrapalha o canvas):
 * joystick esquerdo move, joystick direito mira, botoes de tiro/dash/interagir.
 *
 * QUANDO APARECE (playtest 1: aparecia em PCs com monitor touch / notebook
 * 2-em-1). A deteccao automatica exige as TRES condicoes:
 *   1. ponteiro grosso     -> matchMedia('(pointer: coarse)')
 *   2. sem hover           -> matchMedia('(hover: none)')
 *   3. userAgent movel     -> Android/iPhone/iPad/iPod/Mobile
 * O jogador tambem pode forcar no menu (CONTROLES: AUTO / TOUCH / TECLADO),
 * preferencia salva em localStorage na chave `touchPref`.
 */

/** Chave da preferencia no localStorage. */
export const TOUCH_PREF_KEY = 'touchPref';
/** Rotulos para a UI. */
export const TOUCH_PREF_LABEL = { auto: 'AUTO', touch: 'TOUCH', keyboard: 'TECLADO' };
const PREF_ORDER = ['auto', 'touch', 'keyboard'];

function safeStorage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
}

/**
 * Deteccao de dispositivo realmente movel/touch. Exige pointer coarse E hover
 * none E userAgent movel — assim Windows com tela touch, monitores USB e
 * notebooks 2-em-1 (que tem hover e UA de desktop) NAO mostram o overlay.
 * @param {object} win objeto tipo window (injetavel para teste)
 * @param {string} ua userAgent (injetavel para teste)
 */
export function detectTouchDevice(win = (typeof window !== 'undefined' ? window : null), ua = null) {
  if (!win || typeof win.matchMedia !== 'function') return false;
  const coarse = !!(win.matchMedia('(pointer: coarse)') || {}).matches;
  const noHover = !!(win.matchMedia('(hover: none)') || {}).matches;
  const agent = ua !== null ? ua : ((win.navigator && win.navigator.userAgent) || '');
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(agent);
  return coarse && noHover && mobileUA;
}

/** Le a preferencia salva ('auto' | 'touch' | 'keyboard'). */
export function loadTouchPref(storage = safeStorage()) {
  try {
    const v = storage && storage.getItem(TOUCH_PREF_KEY);
    return PREF_ORDER.includes(v) ? v : 'auto';
  } catch (e) { return 'auto'; }
}

/** Salva a preferencia (chave `touchPref`). */
export function saveTouchPref(pref, storage = safeStorage()) {
  try { if (storage) storage.setItem(TOUCH_PREF_KEY, pref); } catch (e) { /* modo privado */ }
}

/** Resolve a preferencia + deteccao: o overlay deve aparecer? */
export function resolveTouchEnabled(pref, isTouchDevice) {
  if (pref === 'touch') return true;
  if (pref === 'keyboard') return false;
  return !!isTouchDevice;
}

export class TouchControls {
  constructor(container, opts = {}) {
    this.root = container;
    this.enabled = false;
    this.storage = opts.storage !== undefined ? opts.storage : safeStorage();
    this.isTouchDevice = opts.isTouchDevice !== undefined ? opts.isTouchDevice : detectTouchDevice();
    this.pref = opts.pref || loadTouchPref(this.storage);
    this.move = { active: false, x: 0, y: 0, id: null, ox: 0, oy: 0 };
    this.aim = { active: false, x: 1, y: 0, id: null, ox: 0, oy: 0 };
    this.buttons = { fire: false, secondary: false, dash: false, interact: false, pause: false };
    this.justButtons = new Set();
    this.el = {};
    this._build();
    this.apply();
  }

  /** Decide se o overlay aparece conforme a preferencia salva + deteccao. */
  apply() {
    this.show(resolveTouchEnabled(this.pref, this.isTouchDevice));
  }

  /** Troca a preferencia (usada pelo menu) e persiste em localStorage. */
  setPref(pref, { persist = true } = {}) {
    this.pref = PREF_ORDER.includes(pref) ? pref : 'auto';
    if (persist) saveTouchPref(this.pref, this.storage);
    this.apply();
    return this.pref;
  }

  /** Ciclo AUTO -> TOUCH -> TECLADO (botao de controles no menu). */
  cyclePref(step = 1) {
    const i = PREF_ORDER.indexOf(this.pref);
    return this.setPref(PREF_ORDER[(i + step + PREF_ORDER.length) % PREF_ORDER.length]);
  }

  /** Zera todo o estado de input de toque (evita input "preso" ao esconder). */
  resetState() {
    for (const st of [this.move, this.aim]) {
      st.active = false; st.id = null; st.x = 0; st.y = 0;
    }
    this.aim.x = 1;
    for (const k of Object.keys(this.buttons)) this.buttons[k] = false;
    this.justButtons.clear();
  }

  show(v) {
    this.enabled = !!v;
    if (!this.enabled) this.resetState();   // nao deixa input preso ao esconder
    if (this.root) this.root.classList.toggle('hidden', !this.enabled);
    for (const el of Object.values(this.el || {})) {
      if (el && el.classList) el.classList.toggle('hidden', !this.enabled);
    }
  }

  _build() {
    if (!this.root) return;
    this.root.innerHTML = '';
    const stick = (cls, side) => {
      const d = document.createElement('div');
      d.className = 'stick ' + side;
      const knob = document.createElement('div');
      knob.className = 'knob';
      d.appendChild(knob);
      this.root.appendChild(d);
      d.dataset.side = side;
      return { el: d, knob };
    };
    const ls = stick('left', 'left');
    const rs = stick('right', 'right');
    this.el.move = ls; this.el.aim = rs;

    const btn = (cls, label, action) => {
      const b = document.createElement('div');
      b.className = 'btn ' + cls;
      b.textContent = label;
      b.dataset.action = action;
      this.root.appendChild(b);
      return b;
    };
    this.el.fire = btn('fire', 'FIRE', 'fire');
    this.el.dash = btn('dash', 'DASH', 'dash');
    this.el.act = btn('act', 'E', 'interact');
    this.el.pause = btn('pause', 'II', 'pause');

    // ---- joysticks
    const bindStick = (ref, state, isAim) => {
      const start = (ev) => {
        if (!this.enabled) return;
        const touch = ev.changedTouches ? ev.changedTouches[0] : ev;
        state.active = true;
        state.id = touch.identifier ?? 'mouse';
        const rect = ref.el.getBoundingClientRect();
        state.ox = rect.left + rect.width / 2;
        state.oy = rect.top + rect.height / 2;
        move(touch);
      };
      const move = (touch) => {
        const dx = touch.clientX - state.ox;
        const dy = touch.clientY - state.oy;
        const len = Math.hypot(dx, dy) || 1;
        const max = 46;
        const k = Math.min(1, len / max);
        const nx = (dx / len) * k, ny = (dy / len) * k;
        if (isAim) {
          if (k > 0.18) { state.x = dx / len; state.y = dy / len; }
        } else {
          state.x = nx; state.y = ny;
        }
        ref.knob.style.transform = `translate(${nx * 30}px, ${ny * 30}px)`;
      };
      const end = () => {
        state.active = false;
        state.x = 0; state.y = 0;
        ref.knob.style.transform = 'translate(0,0)';
        if (isAim) { state.x = 1; state.y = 0; }
      };
      ref.el.addEventListener('touchstart', e => { e.preventDefault(); start(e); }, { passive: false });
      ref.el.addEventListener('touchmove', e => { e.preventDefault(); if (state.active) move(e.changedTouches[0]); }, { passive: false });
      ref.el.addEventListener('touchend', e => { e.preventDefault(); end(); }, { passive: false });
      ref.el.addEventListener('touchcancel', end);
      // suporte a mouse (teste em desktop)
      ref.el.addEventListener('mousedown', e => { e.preventDefault(); start(e); });
      addEventListener('mousemove', e => { if (state.active && state.id === 'mouse') move(e); });
      addEventListener('mouseup', () => { if (state.active && state.id === 'mouse') end(); });
    };
    bindStick(this.el.move, this.move, false);
    bindStick(this.el.aim, this.aim, true);

    // ---- botoes
    for (const [key, el] of Object.entries({ fire: this.el.fire, dash: this.el.dash, interact: this.el.act, pause: this.el.pause })) {
      const press = e => {
        e.preventDefault();
        if (!this.enabled) return;
        if (!this.buttons[key]) this.justButtons.add(key);
        this.buttons[key] = true;
        el.style.background = '#ffffff44';
      };
      const release = e => { e && e.preventDefault(); this.buttons[key] = false; el.style.background = ''; };
      el.addEventListener('touchstart', press, { passive: false });
      el.addEventListener('touchend', release, { passive: false });
      el.addEventListener('mousedown', press);
      el.addEventListener('mouseup', release);
      el.addEventListener('mouseleave', release);
    }
  }

  isDown(action) {
    if (!this.enabled || action === 'secondary') return false;
    return !!this.buttons[action];
  }

  justPressed(action) { return this.enabled && this.justButtons.has(action); }

  endFrame() { this.justButtons.clear(); }
}
