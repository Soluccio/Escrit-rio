/**
 * Victory.js — fim do jogo: animacao do predio, kanji 終 e a ESCOLHA FINAL
 * (aceitar a proposta do CEO = loop, ou quebrar o ciclo = final verdadeiro).
 */
import { VIEW_W, VIEW_H } from '../data/constants.js';

export class Victory {
  constructor(font, sprites) {
    this.font = font;
    this.sprites = sprites;
    this.time = 0;
    this.stage = 'building';     // building | choice | ending
    this.index = 0;
    this.ending = null;
    this.report = null;
  }

  open(report) {
    this.time = 0;
    this.stage = 'building';
    this.index = 0;
    this.ending = null;
    this.report = report;
  }

  get options() { return ['ACEITAR A PROPOSTA (VIRAR CEO)', 'QUEBRAR O CICLO']; }

  update(dt, game, input) {
    this.time += dt;
    if (this.stage === 'building') {
      if (this.time > 4.5) { this.stage = 'choice'; this.time = 0; }
      if (input.pressed('confirm')) { this.stage = 'choice'; this.time = 0; }
      return;
    }
    if (this.stage === 'choice') {
      if (input.pressed('up') || input.pressed('down')) { this.index = 1 - this.index; game.audio.ui(); }
      if (input.pressed('confirm') || input.pressed('interact')) {
        this.ending = this.index === 0 ? 'ceo' : 'ciclo';
        this.stage = 'ending';
        this.time = 0;
        game.finishRun(this.ending);
      }
      return;
    }
    // ending
    if (this.time > 2 && (input.pressed('confirm') || input.pressed('interact') || input.pressed('pause'))) {
      game.toMenu();
    }
    if (this.time > 14) game.toMenu();
  }

  draw(ctx, game) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (this.stage === 'building') return this._building(ctx, game);
    if (this.stage === 'choice') return this._choice(ctx);
    return this._ending(ctx, game);
  }

  /** Andar 6 visto por fora: o predio subindo ate o ceu. */
  _building(ctx, game) {
    const t = this.time;
    // ceu do amanhecer (18h passou, o sol esta se pondo)
    for (let i = 0; i < 6; i++) {
      const c = ['#1a1a2e', '#1f1b3a', '#2a2145', '#3a2952', '#523055', '#6b3a55'][i];
      ctx.fillStyle = c;
      ctx.fillRect(0, (i * VIEW_H) / 6, VIEW_W, VIEW_H / 6 + 1);
    }
    // predio subindo
    const h = Math.min(VIEW_H - 40, t * 40);
    const bw = 90;
    const bx = VIEW_W / 2 - bw / 2;
    const by = VIEW_H - 20 - h;
    ctx.fillStyle = '#2b2b3d';
    ctx.fillRect(bx, by, bw, h);
    ctx.fillStyle = '#16213e';
    ctx.fillRect(bx + 2, by + 2, bw - 4, h - 2);
    // janelas acesas
    for (let wy = 0; wy < Math.floor(h / 12); wy++) {
      for (let wx = 0; wx < 5; wx++) {
        const lit = ((wx * 7 + wy * 13) % 5) < 3;
        ctx.fillStyle = lit ? '#ffd54f' : '#3f3f4d';
        ctx.fillRect(bx + 8 + wx * 15, by + 8 + wy * 12, 8, 6);
      }
    }
    // CEO no topo
    this.sprites.draw(ctx, 'boss:ceo:idle', Math.floor(t * 5) % 4, VIEW_W / 2, by - 26, { scale: 1.2 });
    // elevador subindo
    const ey = VIEW_H - 20 - ((t * 60) % Math.max(30, h));
    ctx.fillStyle = '#ffcf4d';
    ctx.fillRect(bx + 6, ey, 6, 8);
    this.font.draw(ctx, 'ANDAR 6 — DIRETORIA', VIEW_W / 2, 16, '#ffcf4d', 2, 'center', '#000000');
    this.font.draw(ctx, 'O CEO caiu. O predio esta em silencio.', VIEW_W / 2, 36, '#8f8fa3', 1, 'center');
    if (this.time > 2) {
      ctx.globalAlpha = Math.min(1, (this.time - 2) / 1.5);
      this.font.drawKanji(ctx, '終', VIEW_W / 2 - 30, VIEW_H / 2 - 40, '#ffcf4d', 6, 0.9);
      ctx.globalAlpha = 1;
    }
    this.font.draw(ctx, 'ENTER para continuar', VIEW_W / 2, VIEW_H - 12, '#3f3f4d', 1, 'center');
  }

  _choice(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.font.drawKanji(ctx, '終', VIEW_W / 2 - 22, 18, '#ffcf4d', 5, 0.8);
    this.font.draw(ctx, 'A CADEIRA ESTA VAZIA', VIEW_W / 2, 78, '#ffcf4d', 2, 'center', '#000000');
    this.font.draw(ctx, '"Assine aqui. Voce sempre assina."', VIEW_W / 2, 96, '#8f8fa3', 1, 'center');
    this.options.forEach((o, i) => {
      const sel = i === this.index;
      const y = 130 + i * 22;
      if (sel) { ctx.fillStyle = '#ffcf4d'; ctx.fillRect(VIEW_W / 2 - 110, y - 4, 220, 15); }
      this.font.draw(ctx, o, VIEW_W / 2, y, sel ? '#12121f' : '#e8e8f0', 1, 'center');
    });
    this.font.draw(ctx, 'Setas para escolher  -  ENTER confirma', VIEW_W / 2, VIEW_H - 14, '#5a5a6b', 1, 'center');
  }

  _ending(ctx, game) {
    const t = this.time;
    const r = this.report || { floor: 6, kills: 0, coins: 0, time: 0, maxCombo: 0, seals: 0 };
    if (this.ending === 'ceo') {
      // loop: vira CEO e o predio recomeca
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      this.sprites.draw(ctx, 'boss:ceo:idle', Math.floor(t * 4) % 4, VIEW_W / 2 + 40, 90, { scale: 1.8 });
      this.sprites.draw(ctx, 'player:max:idle', Math.floor(t * 5) % 4, VIEW_W / 2 - 40, 90, { scale: 1.8 });
      this.font.draw(ctx, 'VOCE ACEITOU A PROPOSTA', VIEW_W / 2, 24, '#ffcf4d', 2, 'center', '#000000');
      this.font.draw(ctx, 'MAX, CEO.', VIEW_W / 2, 44, '#e8e8f0', 1, 'center');
      this.font.wrap(ctx, 'No dia seguinte, um novo estagiario entra pela porta da recepcao. Voce olha pela janela do ultimo andar e nao lembra o proprio nome. O ciclo recomeca — agora com voce no topo.',
        40, 124, VIEW_W - 80, '#8f8fa3', 1, 10);
      this.font.draw(ctx, 'FINAL: O CICLO', VIEW_W / 2, VIEW_H - 30, '#ffcf4d', 1, 'center');
    } else {
      ctx.fillStyle = '#16213e';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      // porta de saida aberta com luz
      ctx.fillStyle = '#0b0b14';
      ctx.fillRect(VIEW_W / 2 - 30, 40, 60, 110);
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(VIEW_W / 2 - 26 + Math.sin(t * 2) * 2, 44, 52, 106);
      this.sprites.draw(ctx, 'player:max:run', Math.floor(t * 8) % 6, VIEW_W / 2 - 30 - t * 4, 120, { scale: 1.8 });
      this.font.draw(ctx, 'VOCE QUEBROU O CICLO', VIEW_W / 2, 20, '#7fe3d4', 2, 'center', '#000000');
      this.font.wrap(ctx, 'Max entrega o cracha na portaria, deseja boa sorte ao proximo estagiario e atravessa a porta giratoria. A rua esta molhada, sao 17h58 e o cafe da esquina aceita pix.',
        40, 162, VIEW_W - 80, '#8f8fa3', 1, 10);
      this.font.draw(ctx, 'FINAL VERDADEIRO: A SAIDA', VIEW_W / 2, VIEW_H - 30, '#7fe3d4', 1, 'center');
    }
    const mm = String(Math.floor(r.time / 60)).padStart(2, '0');
    const ss = String(Math.floor(r.time % 60)).padStart(2, '0');
    this.font.draw(ctx, `TEMPO ${mm}:${ss}   ABATES ${r.kills}   MOEDAS ${r.coins}   SELOS +${r.seals}`,
      VIEW_W / 2, VIEW_H - 18, '#5a5a6b', 1, 'center');
  }
}
