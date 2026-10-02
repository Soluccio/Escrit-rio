/**
 * GameLoop.js — loop com DELTA FIXO de 1/60 (o padrao do prompt).
 * Acumula o tempo real e roda quantos passos de simulacao couberem,
 * com clamp para nao explodir depois de um lag spike ou troca de aba.
 * Funciona no navegador (requestAnimationFrame) e headless (step()).
 */
import { TUNING } from '../data/constants.js';

export class GameLoop {
  constructor(update, draw) {
    this.update = update;
    this.draw = draw;
    this.accumulator = 0;
    this.last = 0;
    this.dt = TUNING.fixedDt;
    this.running = false;
    this.raf = null;
    this.fps = 60;
    this.fpsTimer = 0;
    this.frames = 0;
    this.timeScale = 1;
    this.onFrame = null;
    this.steps = 0;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = now();
    const tick = () => {
      if (!this.running) return;
      const t = now();
      let delta = (t - this.last) / 1000;
      this.last = t;
      if (delta > TUNING.maxFrameDt) delta = TUNING.maxFrameDt;
      this.advance(delta);
      this.draw();
      if (this.onFrame) this.onFrame(delta);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    if (this.raf && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this.raf);
  }

  /** Avanca a simulacao em passos fixos. */
  advance(delta) {
    this.accumulator += delta * this.timeScale;
    const fixed = TUNING.fixedDt;
    let guard = 0;
    while (this.accumulator >= fixed && guard++ < 5) {
      this.update(fixed);
      this.accumulator -= fixed;
      this.steps++;
    }
    this.dt = delta;
    // medidor de FPS
    this.frames++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.frames / this.fpsTimer);
      this.frames = 0;
      this.fpsTimer = 0;
    }
  }

  /** Passo manual (testes headless): roda N passos de 1/60. */
  step(count = 1) {
    for (let i = 0; i < count; i++) this.update(TUNING.fixedDt);
    return count;
  }
}

function now() {
  if (typeof performance !== 'undefined' && performance.now) return performance.now();
  return Date.now();
}
