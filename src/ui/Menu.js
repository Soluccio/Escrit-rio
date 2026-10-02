/**
 * Menu.js — tela inicial: titulo em pixel font, Max idle animando, e as opcoes
 * Novo Jogo / Continuar / Bencas (galeria) / Estagiarios (meta-progressao) / Som.
 * Tambem cuida da selecao de personagem com Selos de Estagio.
 */
import { VIEW_W, VIEW_H, RARITY_COLOR } from '../data/constants.js';
import { BLESSINGS } from '../data/blessings.js';
import { CHARACTERS } from '../data/characters.js';
import { drawPlayerPortrait } from '../sprites/drawPlayer.js';

export class Menu {
  constructor(font, sprites) {
    this.font = font;
    this.sprites = sprites;
    this.mode = 'main';         // main | gallery | chars
    this.index = 0;
    this.time = 0;
    this.scroll = 0;
    this.message = '';
  }

  get options() {
    if (this.mode === 'main') {
      const opts = ['NOVO JOGO'];
      if (this.hasRun) opts.push('CONTINUAR');
      opts.push('BENCAS', 'ESTAGIARIOS', 'SOM: ' + (this.muted ? 'DESLIGADO' : 'LIGADO'));
      return opts;
    }
    if (this.mode === 'chars') return CHARACTERS.map(c => c.name);
    return [];
  }

  open(game) {
    this.mode = 'main';
    this.index = 0;
    this.hasRun = !!game.loadRun();
    this.muted = game.save.data.muted;
  }

  update(dt, game, input) {
    this.time += dt;
    if (this.mode === 'main' || this.mode === 'chars') {
      const opts = this.options;
      if (input.pressed('up')) { this.index = (this.index - 1 + opts.length) % opts.length; game.audio.ui(); }
      if (input.pressed('down')) { this.index = (this.index + 1) % opts.length; game.audio.ui(); }
      if (input.pressed('confirm') || input.pressed('interact')) this.select(game);
    } else {
      if (input.pressed('up')) this.scroll = Math.max(0, this.scroll - 1);
      if (input.pressed('down')) this.scroll = Math.min(Math.ceil(BLESSINGS.length / 2) - 6, this.scroll + 1);
      if (input.pressed('pause') || input.pressed('cancel') || input.pressed('confirm')) {
        this.mode = 'main'; this.index = 0; game.audio.ui();
      }
    }
  }

  select(game) {
    game.audio.ui();
    const opts = this.options;
    if (this.mode === 'chars') {
      const ch = CHARACTERS[this.index];
      const unlocked = game.save.data.unlockedChars.includes(ch.id);
      if (!unlocked) {
        if (game.save.unlockChar(ch.id, ch.cost)) {
          this.message = ch.name.toUpperCase() + ' CONTRATADO!';
          game.save.data.selectedChar = ch.id;
          game.save.save();
          game.audio.sfx('blessing');
        } else {
          this.message = 'FALTAM ' + (ch.cost - game.save.data.seals) + ' SELOS';
          game.audio.sfx('click', { pitch: 0.6 });
        }
        return;
      }
      game.save.data.selectedChar = ch.id;
      game.save.save();
      this.message = ch.name.toUpperCase() + ' SELECIONADO';
      return;
    }
    switch (opts[this.index]) {
      case 'NOVO JOGO': game.startRun(); break;
      case 'CONTINUAR': game.continueRun(); break;
      case 'BENCAS': this.mode = 'gallery'; this.scroll = 0; break;
      case 'ESTAGIARIOS': this.mode = 'chars'; this.index = 0; break;
      default: {
        const muted = game.save.toggleMute();
        game.audio.setMuted(muted);
        this.muted = muted;
        break;
      }
    }
  }

  draw(ctx, game) {
    // fundo do escritorio
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // chao em perspectiva simples
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 ? '#1a2740' : '#182238';
      ctx.fillRect(0, 120 + i * 12, VIEW_W, 12);
    }
    // letreiro
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(40, 20, VIEW_W - 80, 52);
    ctx.strokeStyle = '#ffcf4d';
    ctx.strokeRect(40.5, 20.5, VIEW_W - 81, 51);
    this.font.draw(ctx, 'PILHA DE PAPEL', VIEW_W / 2, 30, '#ffcf4d', 3, 'center', '#7a5a13');
    this.font.draw(ctx, 'ROGUELIKE CORPORATIVO', VIEW_W / 2, 56, '#8f8fa3', 1, 'center');

    // Max idle animando no chao
    const t = this.time;
    const frame = Math.floor(t * 6) % 4;
    this.sprites.draw(ctx, 'player:' + game.save.data.selectedChar + ':idle', frame, 90, 150, { scale: 2.5 });
    // mesa e monitor
    this.sprites.draw(ctx, 'prop:desk', 0, 90, 178, { scale: 2.5 });
    this.sprites.draw(ctx, 'prop:plant', Math.floor(t * 3) % 2, 40, 160, { scale: 2.5 });
    this.sprites.draw(ctx, 'prop:printer', Math.floor(t * 5) % 4, VIEW_W - 60, 168, { scale: 2.5 });

    if (this.mode === 'main') {
      const opts = this.options;
      opts.forEach((o, i) => {
        const sel = i === this.index;
        const y = 96 + i * 16;
        if (sel) {
          ctx.fillStyle = '#ffcf4d';
          ctx.fillRect(VIEW_W / 2 - 60, y - 2, 120, 13);
        }
        this.font.draw(ctx, o, VIEW_W / 2, y, sel ? '#12121f' : '#e8e8f0', 1, 'center');
      });
      this.font.draw(ctx, 'WASD move  MOUSE mira  CLIQUE atira  ESPACO dash  E interage',
        VIEW_W / 2, VIEW_H - 14, '#5a5a6b', 1, 'center');
    } else if (this.mode === 'gallery') {
      this.font.draw(ctx, 'BENCAS (' + game.save.data.blessingsSeen.length + '/' + BLESSINGS.length + ')',
        VIEW_W / 2, 88, '#ffcf4d', 1, 'center');
      const cols = 2;
      BLESSINGS.slice(this.scroll * cols, this.scroll * cols + 12).forEach((b, i) => {
        const x = 36 + (i % cols) * (VIEW_W / 2 - 20);
        const y = 100 + Math.floor(i / cols) * 22;
        const seen = game.save.data.blessingsSeen.includes(b.id);
        ctx.fillStyle = '#12121f';
        ctx.fillRect(x - 4, y - 2, VIEW_W / 2 - 24, 20);
        ctx.strokeStyle = seen ? RARITY_COLOR[b.rarity] : '#3f3f4d';
        ctx.strokeRect(x - 3.5, y - 1.5, VIEW_W / 2 - 25, 19);
        this.font.draw(ctx, seen ? b.name.toUpperCase() : '???', x, y + 1,
          seen ? RARITY_COLOR[b.rarity] : '#3f3f4d', 1);
        this.font.wrap(ctx, seen ? b.desc : 'Bencao ainda nao encontrada.', x, y + 9, VIEW_W / 2 - 30, '#8f8fa3', 1, 8);
      });
      this.font.draw(ctx, 'ESC volta', VIEW_W / 2, VIEW_H - 12, '#5a5a6b', 1, 'center');
    } else if (this.mode === 'chars') {
      this.font.draw(ctx, 'SELOS DE ESTAGIO: ' + game.save.data.seals, VIEW_W / 2, 88, '#ffd54f', 1, 'center');
      CHARACTERS.forEach((c, i) => {
        const sel = i === this.index;
        const unlocked = game.save.data.unlockedChars.includes(c.id);
        const x = 70 + (i % 3) * 118;
        const y = 108 + Math.floor(i / 3) * 54;
        ctx.fillStyle = sel ? '#1e1e30' : '#12121f';
        ctx.fillRect(x - 30, y - 4, 108, 46);
        ctx.strokeStyle = sel ? '#ffcf4d' : unlocked ? '#5a5a6b' : '#3f3f4d';
        ctx.lineWidth = sel ? 2 : 1;
        ctx.strokeRect(x - 29.5, y - 3.5, 107, 45);
        // retrato procedural
        ctx.save();
        ctx.translate(x - 12, y);
        if (!unlocked) ctx.globalAlpha = 0.25;
        drawPlayerPortrait(ctx, c.id);
        ctx.restore();
        this.font.draw(ctx, c.name.toUpperCase(), x + 6, y + 2, unlocked ? '#e8e8f0' : '#5a5a6b', 1);
        if (unlocked) {
          this.font.wrap(ctx, c.desc, x + 6, y + 12, 70, '#8f8fa3', 1, 8);
        } else {
          this.font.draw(ctx, c.cost + ' SELOS', x + 6, y + 14, '#ffd54f', 1);
          this.font.wrap(ctx, c.desc, x + 6, y + 24, 70, '#5a5a6b', 1, 8);
        }
      });
      this.font.draw(ctx, 'ESC volta  -  ENTER seleciona', VIEW_W / 2, VIEW_H - 12, '#5a5a6b', 1, 'center');
    }
    if (this.message) this.font.draw(ctx, this.message, VIEW_W / 2, VIEW_H - 24, '#7fe3d4', 1, 'center');
    this.font.draw(ctx, 'v1.0  -  ' + game.save.data.runs + ' runs', 6, VIEW_H - 10, '#3f3f4d', 1);
  }
}
