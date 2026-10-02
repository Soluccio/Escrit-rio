/**
 * Camera.js — segue o player com deadzone, lerp 0.15, limite nos bounds da sala,
 * zoom (CAMERA.zoom em salas normais, CAMERA.zoomBoss nas arenas de chefe),
 * shake aplicado DEPOIS do lerp e lookahead de mira.
 */
import { clamp, lerp } from './Physics.js';
import { CAMERA } from '../data/constants.js';

export class Camera {
  constructor(viewW, viewH) {
    this.vw = viewW; this.vh = viewH;
    this.x = 0; this.y = 0;
    this.zoom = CAMERA.zoom; this.targetZoom = CAMERA.zoom;
    this.shake = 0; this.shakeX = 0; this.shakeY = 0;
    this.deadzone = { ...CAMERA.deadzone };
    this.lerpAmt = CAMERA.lerp;
    this.bounds = { x: 0, y: 0, w: 640, h: 480 };
    this.lookahead = CAMERA.lookahead;
    this._rng = 1;
  }

  setBounds(w, h) { this.bounds = { x: 0, y: 0, w, h }; }

  snap(px, py) { this._target(px, py); this.x = this.tx; this.y = this.ty; }

  _target(px, py, aim = null) {
    let tx = px, ty = py;
    if (aim) { tx += aim.x * this.lookahead; ty += aim.y * this.lookahead; }
    this.tx = tx; this.ty = ty;
  }

  addShake(amount) { this.shake = Math.min(14, this.shake + amount); }

  update(dt, px, py, aim = null) {
    this._target(px, py, aim);
    // deadzone: so move se o alvo sair da caixa
    const dx = this.tx - this.x, dy = this.ty - this.y;
    const dzx = this.deadzone.w / this.zoom, dzy = this.deadzone.h / this.zoom;
    let wantX = this.x, wantY = this.y;
    if (Math.abs(dx) > dzx) wantX = this.x + (Math.abs(dx) - dzx) * Math.sign(dx);
    if (Math.abs(dy) > dzy) wantY = this.y + (Math.abs(dy) - dzy) * Math.sign(dy);
    this.x = lerp(this.x, wantX, this.lerpAmt);
    this.y = lerp(this.y, wantY, this.lerpAmt);

    // zoom suave
    this.zoom = lerp(this.zoom, this.targetZoom, 1 - Math.pow(0.001, dt));

    // limites da sala (considerando zoom)
    const halfW = this.vw / (2 * this.zoom), halfH = this.vh / (2 * this.zoom);
    const b = this.bounds;
    if (b.w <= halfW * 2) this.x = b.x + b.w / 2;
    else this.x = clamp(this.x, b.x + halfW, b.x + b.w - halfW);
    if (b.h <= halfH * 2) this.y = b.y + b.h / 2;
    else this.y = clamp(this.y, b.y + halfH, b.y + b.h - halfH);

    // shake decai depois do lerp
    if (this.shake > 0.05) {
      this.shake *= Math.pow(0.0009, dt);
      this._rng = (this._rng * 16807 + 7) % 2147483647;
      const a = (this._rng / 2147483647) * Math.PI * 2;
      this.shakeX = Math.cos(a) * this.shake;
      this.shakeY = Math.sin(a) * this.shake * 0.8;
    } else { this.shake = 0; this.shakeX = 0; this.shakeY = 0; }
  }

  /** Aplica a transformacao no contexto (mundo -> tela). */
  apply(ctx) {
    ctx.save();
    ctx.translate(this.vw / 2, this.vh / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-Math.round(this.x + this.shakeX), -Math.round(this.y + this.shakeY));
  }

  restore(ctx) { ctx.restore(); }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x - this.shakeX) * this.zoom + this.vw / 2,
      y: (wy - this.y - this.shakeY) * this.zoom + this.vh / 2,
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.vw / 2) / this.zoom + this.x + this.shakeX,
      y: (sy - this.vh / 2) / this.zoom + this.y + this.shakeY,
    };
  }

  /** Retangulo visivel em coordenadas de mundo (para culling). */
  view() {
    const halfW = this.vw / (2 * this.zoom), halfH = this.vh / (2 * this.zoom);
    return { x: this.x - halfW - 8, y: this.y - halfH - 8, w: halfW * 2 + 16, h: halfH * 2 + 16 };
  }
}
