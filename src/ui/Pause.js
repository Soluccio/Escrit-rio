/**
 * Pause.js — ESC: Continuar / Reiniciar Run / Sair, com estatisticas da run.
 */
import { VIEW_W, VIEW_H } from '../data/constants.js';

export class Pause {
  constructor(font) {
    this.font = font;
    this.index = 0;
    this.time = 0;
  }
  get options() { return ['CONTINUAR', 'REINICIAR RUN', 'SAIR PARA O MENU']; }

  open() { this.index = 0; this.time = 0; }

  update(dt, game, input) {
    this.time += dt;
    if (input.pressed('up')) { this.index = (this.index - 1 + this.options.length) % this.options.length; game.audio.ui(); }
    if (input.pressed('down')) { this.index = (this.index + 1) % this.options.length; game.audio.ui(); }
    if (input.pressed('pause')) { game.togglePause(); return; }
    if (input.pressed('confirm') || input.pressed('interact')) {
      game.audio.ui();
      switch (this.options[this.index]) {
        case 'CONTINUAR': game.togglePause(); break;
        case 'REINICIAR RUN': game.startRun(); break;
        case 'SAIR PARA O MENU': game.toMenu(); break;
      }
    }
  }

  draw(ctx, game) {
    ctx.fillStyle = 'rgba(10,10,20,0.8)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.font.draw(ctx, 'PAUSA', VIEW_W / 2, 40, '#ffcf4d', 3, 'center', '#000000');
    this.options.forEach((o, i) => {
      const sel = i === this.index;
      const y = 90 + i * 18;
      if (sel) { ctx.fillStyle = '#ffcf4d'; ctx.fillRect(VIEW_W / 2 - 62, y - 3, 124, 13); }
      this.font.draw(ctx, o, VIEW_W / 2, y, sel ? '#12121f' : '#e8e8f0', 1, 'center');
    });
    const s = game.stats;
    const t = s.time;
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(Math.floor(t % 60)).padStart(2, '0');
    this.font.draw(ctx, `ANDAR ${game.floorN}/6   ${mm}:${ss}   ABATES ${s.kills}`, VIEW_W / 2, VIEW_H - 40, '#8f8fa3', 1, 'center');
    this.font.draw(ctx, `MOEDAS ${s.coins}   COMBO MAX x${game.combat.maxCombo}`, VIEW_W / 2, VIEW_H - 28, '#8f8fa3', 1, 'center');
    this.font.draw(ctx, 'BENCAOS: ' + (game.player.stats.blessings.map(b => b.name).join(', ') || 'nenhuma'),
      VIEW_W / 2, VIEW_H - 16, '#5a5a6b', 1, 'center');
  }
}
