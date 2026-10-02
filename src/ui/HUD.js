/**
 * HUD.js — coracoes, moedas, bencaos ativas, item ativo, cooldown do dash,
 * barra de vida do chefe, combo counter e hint de execucao.
 */
import { VIEW_W, VIEW_H, RARITY_COLOR } from '../data/constants.js';
import { ITEMS } from '../data/items.js';

export class HUD {
  constructor(font, sprites) {
    this.font = font;
    this.sprites = sprites;
    this.coinAnim = 0;
  }

  draw(ctx, game, dt) {
    const p = game.player;
    if (!p) return;
    this.coinAnim += dt;
    this._hearts(ctx, p);
    this._coins(ctx, game);
    this._blessings(ctx, p);
    this._item(ctx, p);
    this._dash(ctx, p);
    this._combo(ctx, game);
    this._bossBar(ctx, game);
    this._floorLabel(ctx, game);
  }

  _hearts(ctx, p) {
    const full = Math.ceil(p.hp);
    const max = p.maxHp;
    for (let i = 0; i < max; i++) {
      const x = 8 + i * 11, y = 8;
      const filled = i < full;
      ctx.fillStyle = '#00000088';
      ctx.fillRect(x - 1, y - 1, 10, 9);
      ctx.fillStyle = filled ? '#ef5350' : '#3f3f4d';
      // coracao 8x7
      ctx.fillRect(x + 1, y + 1, 2, 2); ctx.fillRect(x + 5, y + 1, 2, 2);
      ctx.fillRect(x, y + 2, 8, 2);
      ctx.fillRect(x + 1, y + 4, 6, 1);
      ctx.fillRect(x + 2, y + 5, 4, 1);
      ctx.fillRect(x + 3, y + 6, 2, 1);
      if (filled) {
        ctx.fillStyle = '#ff8a80';
        ctx.fillRect(x + 1, y + 2, 2, 1);
        ctx.fillRect(x + 3, y + 2, 1, 1);
      }
      if (p.hp > i && p.hp < i + 1) {   // meio coracao
        ctx.fillStyle = '#12121f';
        ctx.fillRect(x + 4, y + 1, 4, 6);
      }
    }
  }

  _coins(ctx, game) {
    const x = VIEW_W - 8, y = 6;
    // moeda girando
    const w = [6, 4, 2, 4][Math.floor(this.coinAnim * 6) % 4];
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(x - 9 * 6 + 100, y, 0, 0);
    ctx.fillStyle = '#00000088';
    const txt = String(game.stats.coins);
    const tw = this.font.measure(txt, 1);
    ctx.fillRect(x - tw - 20, y - 1, tw + 18, 10);
    // icone
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(x - tw - 16, y + 2, w, 6);
    this.font.draw(ctx, txt, x, y + 1, '#ffd54f', 1, 'right', '#000000');
  }

  _blessings(ctx, p) {
    const list = p.stats.blessings;
    if (!list.length) return;
    const y = 20;
    list.slice(-10).forEach((b, i) => {
      const x = 8 + i * 9;
      ctx.fillStyle = '#12121f';
      ctx.fillRect(x, y, 8, 8);
      ctx.fillStyle = RARITY_COLOR[b.rarity] || '#e8e8f0';
      ctx.fillRect(x + 1, y + 1, 6, 6);
      ctx.fillStyle = '#12121f';
      ctx.fillRect(x + 2, y + 2, 4, 4);
      ctx.fillStyle = RARITY_COLOR[b.rarity];
      ctx.fillRect(x + 3, y + 3, 2, 2);
    });
  }

  _item(ctx, p) {
    const item = ITEMS[p.activeItem];
    if (!item) return;
    const x = 8, y = VIEW_H - 22;
    ctx.fillStyle = '#12121fcc';
    ctx.fillRect(x - 2, y - 2, 74, 20);
    ctx.strokeStyle = p.secondaryCooldown > 0 ? '#5a5a6b' : '#ffd54f';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 2.5, y - 2.5, 74, 20);
    this.font.draw(ctx, item.name.slice(0, 12).toUpperCase(), x + 2, y + 2, '#e8e8f0', 1);
    // barra de cooldown
    const pct = 1 - Math.max(0, p.secondaryCooldown) / item.cooldown;
    ctx.fillStyle = '#2b2b3d';
    ctx.fillRect(x, y + 12, 68, 3);
    ctx.fillStyle = pct >= 1 ? '#7fe3d4' : '#ffcf4d';
    ctx.fillRect(x, y + 12, 68 * pct, 3);
    this.font.draw(ctx, '[BOT2]', x + 52, y + 2, '#8f8fa3', 1);
  }

  _dash(ctx, p) {
    const w = 40, x = 8, y = VIEW_H - 32;
    ctx.fillStyle = '#12121faa';
    ctx.fillRect(x, y, w, 4);
    const pct = 1 - Math.max(0, p.dashCooldown) / p.stats.dashCooldown;
    ctx.fillStyle = pct >= 1 ? '#7fe3d4' : '#3f51b5';
    ctx.fillRect(x, y, w * pct, 4);
    if (p.dashCharges > 1) this.font.draw(ctx, 'x' + p.dashCharges, x + w + 3, y - 1, '#7fe3d4', 1);
  }

  _combo(ctx, game) {
    const c = game.combat.combo;
    if (c < 2) return;
    const t = game.combat.comboTimer / 2;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.6);
    const scale = c >= 5 ? 2 : 1;
    this.font.draw(ctx, 'x' + c + (c >= 3 ? ' COMBO!' : ''), VIEW_W / 2, 20, '#ffcf4d', scale, 'center', '#000000');
    ctx.restore();
  }

  _bossBar(ctx, game) {
    const boss = game.boss;
    if (!boss || boss.dead) return;
    // acima da caixa do item ativo (que ocupa o canto inferior esquerdo)
    const w = VIEW_W - 80, h = 6, x = 40, y = VIEW_H - 44;
    ctx.fillStyle = '#000000aa';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#2b2b3d';
    ctx.fillRect(x, y, w, h);
    const pct = Math.max(0, boss.hp / boss.maxHp);
    const grad = boss.phase >= 3 ? '#ff5252' : boss.phase >= 2 ? '#ff9800' : '#ff8fa3';
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w * pct, h);
    // marcas de fase
    for (const ph of boss.def.phases) {
      if (ph === 1) continue;
      const mx = x + w * (1 / ph);
      ctx.fillStyle = '#12121f';
      ctx.fillRect(mx, y - 1, 1, h + 2);
    }
    const label = boss.def.name + (boss.fury ? '  [FURIA]' : '');
    const labelW = this.font.measure(label, 1);
    ctx.fillStyle = '#000000aa';
    ctx.fillRect(VIEW_W / 2 - labelW / 2 - 3, y - 11, labelW + 6, 10);
    this.font.draw(ctx, label, VIEW_W / 2, y - 9, boss.def.color, 1, 'center', '#000000');
    // postura
    if (boss.posture > 0) {
      const pw = w * (boss.posture / boss.postureMax);
      ctx.fillStyle = boss.executable ? '#ff5252' : '#ffcf4d';
      ctx.fillRect(x, y + h + 2, pw, 2);
    }
  }

  _floorLabel(ctx, game) {
    const label = `${game.floorData.n}-${game.floorData.name.toUpperCase()}`;
    ctx.fillStyle = '#00000066';
    ctx.fillRect(VIEW_W - this.font.measure(label, 1) - 8, 17, this.font.measure(label, 1) + 6, 9);
    this.font.draw(ctx, label, VIEW_W - 5, 18, '#8f8fa3', 1, 'right');
    if (game.stats.hasKey) {
      this.font.draw(ctx, 'CHAVE', VIEW_W - 5, 28, '#ffd54f', 1, 'right');
    }
  }
}
