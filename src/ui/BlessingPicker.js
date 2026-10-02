/**
 * BlessingPicker.js — "escolha 1 de 3 bencaos" em cartas grandes, apos limpar
 * sala de combate / abrir bau / entrar em nova area.
 * Navegacao: clique do mouse, setas + Enter, ou toque.
 */
import { VIEW_W, VIEW_H, RARITY_COLOR } from '../data/constants.js';
import { rollBlessings } from '../data/blessings.js';

export class BlessingPicker {
  constructor(font, sprites) {
    this.font = font;
    this.sprites = sprites;
    this.active = false;
    this.options = [];
    this.index = 1;
    this.time = 0;
    this.reason = '';
    this.onPick = null;
    this.rng = null;
  }

  open(rng, ownedIds, reason, onPick, pool = null) {
    this.rng = rng;
    this.options = rollBlessings(rng, 3, ownedIds, pool);
    if (!this.options.length) { onPick(null); return false; }
    this.active = true;
    this.index = Math.min(1, this.options.length - 1);
    this.time = 0;
    this.reason = reason;
    this.onPick = onPick;
    return true;
  }

  update(dt, game, input) {
    if (!this.active) return;
    this.time += dt;
    if (input.pressed('left')) this.index = Math.max(0, this.index - 1);
    if (input.pressed('right')) this.index = Math.min(this.options.length - 1, this.index + 1);
    // mouse/toque: hover nas cartas
    const aim = input.aim();
    if (aim && aim.source === 'mouse') {
      const cardW = 76, gap = 8;
      const totalW = this.options.length * cardW + (this.options.length - 1) * gap;
      const startX = VIEW_W / 2 - totalW / 2;
      const cardH = 92, cardY = VIEW_H / 2 - cardH / 2 + 6;
      for (let i = 0; i < this.options.length; i++) {
        const x = startX + i * (cardW + gap);
        if (aim.x >= x && aim.x <= x + cardW && aim.y >= cardY && aim.y <= cardY + cardH) {
          this.index = i;
          if (input.mouse.justDown || input.pressed('confirm')) this.pick(this.index, game);
        }
      }
      if (input.pressed('confirm')) this.pick(this.index, game);
    } else if (input.pressed('confirm')) {
      this.pick(this.index, game);
    }
  }

  pick(i, game) {
    if (!this.active) return;
    const chosen = this.options[i];
    this.active = false;
    game.audio.sfx('blessing');
    game.save.markBlessing(chosen.id);
    if (this.onPick) this.onPick(chosen);
  }

  draw(ctx, game) {
    if (!this.active) return;
    ctx.fillStyle = 'rgba(10,10,20,0.82)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.font.draw(ctx, 'ESCOLHA SUA BENCAO', VIEW_W / 2, 22, '#ffcf4d', 2, 'center', '#000000');
    this.font.draw(ctx, this.reason, VIEW_W / 2, 42, '#8f8fa3', 1, 'center');

    const cardW = 76, gap = 8, cardH = 92;
    const totalW = this.options.length * cardW + (this.options.length - 1) * gap;
    const startX = VIEW_W / 2 - totalW / 2;
    const cardY = VIEW_H / 2 - cardH / 2 + 6;

    this.options.forEach((b, i) => {
      const x = startX + i * (cardW + gap);
      const sel = i === this.index;
      const lift = sel ? Math.sin(this.time * 6) * 2 - 4 : 0;
      const y = cardY + lift;
      const color = RARITY_COLOR[b.rarity] || '#e8e8f0';
      // sombra
      ctx.fillStyle = '#000000aa';
      ctx.fillRect(x + 2, y + 3, cardW, cardH);
      // carta
      ctx.fillStyle = sel ? '#1e1e30' : '#16162a';
      ctx.fillRect(x, y, cardW, cardH);
      ctx.strokeStyle = color;
      ctx.lineWidth = sel ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cardW - 1, cardH - 1);
      // raridade
      this.font.draw(ctx, b.rarity === 'legendary' ? 'LENDARIA' : b.rarity === 'rare' ? 'RARA' : 'COMUM',
        x + cardW / 2, y + 5, color, 1, 'center');
      // icone
      this._icon(ctx, b.icon, x + cardW / 2, y + 30, color, sel);
      // nome
      this.font.wrap(ctx, b.name.toUpperCase(), x + 6, y + 50, cardW - 12, '#e8e8f0', 1, 9);
      // descricao
      this.font.wrap(ctx, b.desc, x + 6, y + 66, cardW - 12, '#8f8fa3', 1, 8);
      if (sel) {
        ctx.globalAlpha = 0.5 + Math.sin(this.time * 8) * 0.3;
        this.font.draw(ctx, 'ENTER', x + cardW / 2, y + cardH + 4, '#ffcf4d', 1, 'center');
        ctx.globalAlpha = 1;
      }
    });
    this.font.draw(ctx, 'Setas/clique para escolher  -  ENTER para confirmar',
      VIEW_W / 2, VIEW_H - 14, '#5a5a6b', 1, 'center');
  }

  /** Icone procedural da bencao (16x16) desenhado na carta. */
  _icon(ctx, kind, cx, cy, color, sel) {
    ctx.save();
    ctx.translate(cx, cy);
    if (sel) ctx.scale(1.15, 1.15);
    ctx.fillStyle = color;
    switch (kind) {
      case 'coffee':
        ctx.fillRect(-5, -4, 9, 8); ctx.fillRect(4, -2, 2, 4);
        ctx.fillStyle = '#12121f'; ctx.fillRect(-4, -3, 7, 6);
        break;
      case 'clip':
        ctx.fillRect(-6, -3, 12, 2); ctx.fillRect(-6, 1, 12, 2);
        ctx.fillRect(-6, -3, 2, 6); ctx.fillRect(4, -3, 2, 6);
        break;
      case 'badge':
        ctx.fillRect(-4, -6, 8, 12);
        ctx.fillStyle = '#12121f'; ctx.fillRect(-2, -4, 4, 3); ctx.fillRect(-2, 0, 4, 4);
        break;
      case 'note':
        ctx.fillRect(-5, -6, 10, 12);
        ctx.fillStyle = '#12121f';
        for (let i = 0; i < 3; i++) ctx.fillRect(-3, -4 + i * 3, 6, 1);
        break;
      case 'glasses':
        ctx.fillRect(-7, -2, 5, 4); ctx.fillRect(2, -2, 5, 4);
        ctx.fillRect(-2, -1, 4, 1);
        break;
      case 'marker':
        ctx.fillRect(-5, -5, 8, 4); ctx.fillRect(-4, -1, 6, 6);
        break;
      case 'pin':
        ctx.fillRect(-1, -6, 2, 8); ctx.fillRect(-3, 4, 6, 2);
        break;
      case 'drive':
        ctx.fillRect(-4, -6, 8, 10); ctx.fillRect(-2, 4, 4, 2);
        ctx.fillStyle = '#12121f'; ctx.fillRect(-2, -4, 4, 4);
        break;
      case 'contract':
        ctx.fillRect(-5, -6, 10, 12);
        ctx.fillStyle = '#12121f';
        for (let i = 0; i < 3; i++) ctx.fillRect(-3, -3 + i * 3, 6, 1);
        break;
      case 'money':
        ctx.fillRect(-6, -4, 12, 8);
        ctx.fillStyle = '#12121f'; ctx.fillRect(-2, -1, 4, 3);
        break;
      case 'headset':
        ctx.fillRect(-6, -4, 12, 3); ctx.fillRect(-6, -1, 3, 5); ctx.fillRect(3, -1, 3, 5);
        break;
      case 'chair':
        ctx.fillRect(-4, -6, 8, 6); ctx.fillRect(-1, 0, 2, 5); ctx.fillRect(-4, 5, 8, 2);
        break;
      default:
        ctx.fillRect(-4, -4, 8, 8);
        ctx.fillStyle = '#12121f'; ctx.fillRect(-2, -2, 4, 4);
    }
    ctx.restore();
  }
}
