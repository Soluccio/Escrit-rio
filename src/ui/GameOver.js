/**
 * GameOver.js — mostra andar alcancado, inimigos mortos, moedas, tempo,
 * combo maximo e os Selos de Estagio ganhos. Botao "TENTAR DE NOVO".
 */
import { VIEW_W, VIEW_H } from '../data/constants.js';

export class GameOver {
  constructor(font, sprites) {
    this.font = font;
    this.sprites = sprites;
    this.time = 0;
    this.index = 0;
    this.report = null;
  }

  open(report) { this.time = 0; this.index = 0; this.report = report; }
  get options() { return ['TENTAR DE NOVO', 'MENU']; }

  update(dt, game, input) {
    this.time += dt;
    if (input.pressed('up') || input.pressed('down')) { this.index = 1 - this.index; game.audio.ui(); }
    if (input.pressed('confirm') || input.pressed('interact')) {
      game.audio.ui();
      if (this.index === 0) game.startRun();
      else game.toMenu();
    }
    if (input.pressed('pause')) game.toMenu();
  }

  draw(ctx, game) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // corredor de escritorio descendo
    ctx.fillStyle = '#16162a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const t = this.time;
    for (let i = 0; i < 10; i++) {
      const y = (i * 30 + t * 8) % VIEW_H;
      ctx.fillStyle = i % 2 ? '#1a1a2e' : '#16213e';
      ctx.fillRect(0, y, VIEW_W, 14);
    }
    // Max caido
    ctx.save();
    ctx.globalAlpha = 0.9;
    this.sprites.draw(ctx, 'player:' + (this.report?.char || 'max') + ':death', Math.floor(this.time * 4) % 4,
      VIEW_W / 2 - 60, VIEW_H / 2 + 10, { scale: 2 });
    ctx.restore();
    this.font.draw(ctx, 'VOCE FOI DESLIGADO', VIEW_W / 2, 24, '#ef5350', 2, 'center', '#000000');
    this.font.draw(ctx, 'O predio agradece sua dedicaçao.', VIEW_W / 2, 44, '#8f8fa3', 1, 'center');

    const r = this.report || { floor: 1, kills: 0, coins: 0, time: 0, maxCombo: 0, seals: 0 };
    const mm = String(Math.floor(r.time / 60)).padStart(2, '0');
    const ss = String(Math.floor(r.time % 60)).padStart(2, '0');
    const stats = [
      ['ANDAR ALCANCADO', r.floor + '/6'],
      ['INIMIGOS MORTOS', String(r.kills)],
      ['MOEDAS COLETADAS', String(r.coins)],
      ['COMBO MAXIMO', 'x' + r.maxCombo],
      ['TEMPO', `${mm}:${ss}`],
      ['SELOS DE ESTAGIO', '+' + r.seals],
    ];
    stats.forEach(([k, v], i) => {
      const y = 70 + i * 12;
      this.font.draw(ctx, k, 60, y, '#5a5a6b', 1);
      this.font.draw(ctx, v, VIEW_W - 60, y, '#e8e8f0', 1, 'right');
    });
    this.options.forEach((o, i) => {
      const sel = i === this.index;
      const y = VIEW_H - 34 + i * 14;
      if (sel) { ctx.fillStyle = '#ffcf4d'; ctx.fillRect(VIEW_W / 2 - 60, y - 3, 120, 12); }
      this.font.draw(ctx, o, VIEW_W / 2, y, sel ? '#12121f' : '#e8e8f0', 1, 'center');
    });
  }
}
