/**
 * Blessing.js — bênção no chão ou na loja (item passivo).
 * Aplicar no player chama blessing.apply(stats) definido em data/blessings.js.
 */
import { RARITY_COLOR } from '../data/constants.js';

export class BlessingPickup {
  constructor(blessing, x, y, opts = {}) {
    this.blessing = blessing;
    this.x = x; this.y = y;
    this.price = opts.price || 0;
    this.fromShop = !!opts.fromShop;
    this.sold = false;
    this.time = Math.random() * 6;
    this.float = opts.index || 0;
    this.radius = 12;
  }

  get active() { return !this.sold; }

  update(dt, game) {
    this.time += dt;
    if (this.fromShop) return;
    const p = game.player;
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    if (d < 14) this.collect(game);
  }

  collect(game) {
    if (this.sold) return;
    this.sold = true;
    const p = game.player;
    p.addBlessing(this.blessing);
    game.fx.burst(this.x, this.y, 'gold', { count: 12, speedMult: 1.2 });
    game.fx.banner(this.blessing.name.toUpperCase() + '!', RARITY_COLOR[this.blessing.rarity] || '#ffffff', 1.8, 40);
    game.audio.sfx('blessing');
  }

  draw(ctx, sprites, font) {
    const y = this.y + Math.sin(this.time * 2.5) * 2;
    // carta flutuante
    ctx.fillStyle = '#12121f';
    ctx.fillRect(this.x - 9, y - 12, 18, 24);
    ctx.fillStyle = RARITY_COLOR[this.blessing.rarity] || '#e8e8f0';
    ctx.fillRect(this.x - 8, y - 11, 16, 22);
    ctx.fillStyle = '#12121f';
    ctx.fillRect(this.x - 6, y - 9, 12, 18);
    // simbolo
    ctx.fillStyle = RARITY_COLOR[this.blessing.rarity];
    ctx.fillRect(this.x - 3, y - 5, 6, 6);
    ctx.fillRect(this.x - 1, y - 7, 2, 10);
    if (this.price) {
      font.draw(ctx, '$' + this.price, this.x, y + 10, '#ffd54f', 1, 'center');
    }
  }
}
