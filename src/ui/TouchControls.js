/**
 * TouchControls.js — controles de toque em DOM overlay (nao atrapalha o canvas):
 * joystick esquerdo move, joystick direito mira, botoes de tiro/dash/interagir.
 * So aparece quando o jogo detecta toque (mobile/tablet).
 */
export class TouchControls {
  constructor(container) {
    this.root = container;
    this.enabled = false;
    this.move = { active: false, x: 0, y: 0, id: null, ox: 0, oy: 0 };
    this.aim = { active: false, x: 1, y: 0, id: null, ox: 0, oy: 0 };
    this.buttons = { fire: false, secondary: false, dash: false, interact: false, pause: false };
    this.justButtons = new Set();
    this.el = {};
    this._build();
    this.detectTouch();
  }

  detectTouch() {
    const isTouch = typeof window !== 'undefined' &&
      ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0);
    if (isTouch) this.show(true);
  }

  show(v) {
    this.enabled = v;
    if (this.root) this.root.classList.toggle('hidden', !v);
    if (!this.root) return;
    for (const el of Object.values(this.el)) el.classList.toggle('hidden', !v);
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
      const press = e => { e.preventDefault(); if (!this.buttons[key]) this.justButtons.add(key); this.buttons[key] = true; el.style.background = '#ffffff44'; };
      const release = e => { e && e.preventDefault(); this.buttons[key] = false; el.style.background = ''; };
      el.addEventListener('touchstart', press, { passive: false });
      el.addEventListener('touchend', release, { passive: false });
      el.addEventListener('mousedown', press);
      el.addEventListener('mouseup', release);
      el.addEventListener('mouseleave', release);
    }
  }

  isDown(action) {
    if (action === 'secondary') return false;
    return !!this.buttons[action];
  }

  justPressed(action) { return this.justButtons.has(action); }

  endFrame() { this.justButtons.clear(); }
}
