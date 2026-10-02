/**
 * Dialogue.js — falas comicas dos chefes (e eventos) no topo da tela,
 * com efeito de maquina de escrever e caixa semitransparente.
 */
import { VIEW_W } from '../data/constants.js';

export class Dialogue {
  constructor(font) {
    this.font = font;
    this.lines = [];
    this.current = null;
    this.timer = 0;
    this.charTimer = 0;
    this.chars = 0;
  }

  /** Enfileira uma fala. */
  show(speaker, text, seconds = 3) {
    this.lines.push({ speaker, text, seconds });
    if (!this.current) this._next();
  }

  _next() {
    this.current = this.lines.shift() || null;
    this.timer = this.current ? this.current.seconds : 0;
    this.charTimer = 0;
    this.chars = 0;
  }

  clear() { this.lines.length = 0; this.current = null; }

  update(dt) {
    if (!this.current) return;
    this.timer -= dt;
    this.charTimer += dt;
    if (this.charTimer >= 0.02) {
      this.charTimer = 0;
      this.chars = Math.min(this.current.text.length, this.chars + 1);
    }
    if (this.timer <= 0) this._next();
  }

  get active() { return !!this.current; }

  draw(ctx) {
    if (!this.current) return;
    const text = this.current.text.slice(0, this.chars);
    const wrapW = VIEW_W - 40;
    const lines = this.font.measure(text, 1) > wrapW ? 2 : 1;
    const boxH = 12 + lines * 9;
    const y = 6;
    ctx.fillStyle = '#0b0b14dd';
    ctx.fillRect(6, y, VIEW_W - 12, boxH);
    ctx.strokeStyle = '#ffcf4d';
    ctx.lineWidth = 1;
    ctx.strokeRect(6.5, y + 0.5, VIEW_W - 13, boxH - 1);
    this.font.draw(ctx, this.current.speaker, 12, y + 3, '#ffcf4d', 1);
    this.font.wrap(ctx, text, 12, y + 12, wrapW, '#e8e8f0', 1, 9);
  }
}
