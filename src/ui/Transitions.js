/**
 * Transitions.js — transicao entre andares: tela preta, kanji aparecendo
 * (竹 商 書 会 技 終) e fade in. Tambem faz o fade generico de sala e o
 * slow motion com kanji 終 do fim do jogo.
 */
import { VIEW_W, VIEW_H } from '../data/constants.js';

export class Transitions {
  constructor(font) {
    this.font = font;
    this.active = false;
    this.t = 0;
    this.duration = 2.6;
    this.phase = 'in';        // in: escurece | hold: kanji | out: clareia
    this.kanji = null;
    this.label = '';
    this.color = '#ffcf4d';
    this.onMid = null;
    this.midDone = false;
  }

  /** Inicia a transicao entre andares. */
  floor(nextFloorN, label, onMid) {
    this.active = true;
    this.t = 0;
    this.duration = 2.4;
    this.phase = 'in';
    this.kanji = ['竹', '商', '書', '会', '技', '終'][Math.min(5, nextFloorN - 1)];
    this.label = label;
    this.color = '#ffcf4d';
    this.onMid = onMid;
    this.midDone = false;
  }

  /** Slow motion final com o kanji 終. */
  ending(label, color = '#ffcf4d', duration = 3.2) {
    this.active = true;
    this.t = 0;
    this.duration = duration;
    this.phase = 'hold';
    this.kanji = '終';
    this.label = label;
    this.color = color;
    this.onMid = null;
    this.midDone = true;
  }

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    const fadeTime = this.phase === 'hold' ? this.duration : 0.7;
    if (this.t > fadeTime) {
      if (this.phase === 'in') {
        this.phase = 'hold';
        this.t = 0;
        if (this.onMid && !this.midDone) { this.midDone = true; this.onMid(); }
      } else if (this.phase === 'hold') {
        this.phase = 'out';
        this.t = 0;
      } else {
        this.active = false;
        this.onMid = null;
      }
    }
  }

  get alpha() {
    if (this.phase === 'in') return Math.min(1, this.t / 0.7) * (this.t / 0.7);
    if (this.phase === 'hold') return 1;
    return Math.max(0, 1 - this.t / 0.7);
  }

  draw(ctx, game) {
    if (!this.active) return;
    const a = this.alpha;
    ctx.save();
    ctx.globalAlpha = Math.min(1, a);
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (this.kanji) {
      const scale = 5;
      const w = 9 * scale;
      // kanji grande no centro, com zoom leve
      const zoom = this.phase === 'in' ? 0.8 + a * 0.2 : 1;
      ctx.save();
      ctx.translate(VIEW_W / 2, VIEW_H / 2 - 8);
      ctx.scale(zoom, zoom);
      this.font.drawKanji(ctx, this.kanji, -w / 2, -w / 2, this.color, scale, 1);
      ctx.restore();
    }
    if (this.label) {
      this.font.draw(ctx, this.label.toUpperCase(), VIEW_W / 2, VIEW_H / 2 + 34, '#e8e8f0', 1, 'center');
      this.font.draw(ctx, 'SETOR ' + (game?.floorN ?? ''), VIEW_W / 2, VIEW_H / 2 + 46, '#8f8fa3', 1, 'center');
    }
    ctx.restore();
  }
}
