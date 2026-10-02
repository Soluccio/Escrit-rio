/**
 * Shop.js — loja com 3 itens (arma, bencao, cura) por moedas.
 * Aparece ao interagir com a maquina de vendas na sala de loja.
 */
import { VIEW_W, VIEW_H, RARITY_COLOR } from '../data/constants.js';
import { ITEMS, ITEM_IDS } from '../data/items.js';
import { BLESSINGS } from '../data/blessings.js';

export class Shop {
  constructor(font, sprites) {
    this.font = font;
    this.sprites = sprites;
    this.active = false;
    this.items = [];
    this.index = 0;
    this.time = 0;
    this.message = '';
    this.msgTimer = 0;
  }

  open(game, interactable) {
    const rng = game.rng;
    this.active = true;
    this.index = 0;
    this.time = 0;
    const prices = game.shopPrices();
    const bless = rng.pick(BLESSINGS.filter(b => !game.player.stats.blessings.some(o => o.id === b.id)) || BLESSINGS);
    const itemId = rng.pick(ITEM_IDS);
    this.items = [
      { kind: 'weapon', id: itemId, name: ITEMS[itemId].name, desc: ITEMS[itemId].desc, price: prices.weapon, sold: false },
      { kind: 'blessing', data: bless, name: bless.name, desc: bless.desc, price: prices.blessing, sold: false },
      { kind: 'heal', name: 'Cafe Duplo', desc: 'Restaura 2 coracoes na hora.', price: prices.heal, sold: false },
    ];
    game.audio.sfx('elevator');
  }

  close(game) {
    this.active = false;
    game.audio.sfx('click');
  }

  update(dt, game, input) {
    if (!this.active) return;
    this.time += dt;
    if (this.msgTimer > 0) this.msgTimer -= dt;
    if (input.pressed('left')) this.index = Math.max(0, this.index - 1);
    if (input.pressed('right')) this.index = Math.min(this.items.length - 1, this.index + 1);
    if (input.pressed('interact') || input.pressed('confirm')) {
      this.buy(this.index, game);
    }
    if (input.pressed('pause') || input.pressed('cancel')) this.close(game);
    // clique/toque direto no item
    const aim = input.aim();
    if (aim && aim.source === 'mouse' && input.mouse.justDown) {
      const w = 88, gap = 10;
      const totalW = this.items.length * w + (this.items.length - 1) * gap;
      const startX = VIEW_W / 2 - totalW / 2;
      for (let i = 0; i < this.items.length; i++) {
        const x = startX + i * (w + gap);
        if (aim.x >= x && aim.x <= x + w && aim.y > VIEW_H / 2 - 40 && aim.y < VIEW_H / 2 + 50) {
          this.buy(i, game);
        }
      }
    }
  }

  buy(i, game) {
    const it = this.items[i];
    if (!it || it.sold) return;
    const coins = game.stats.coins;
    if (coins < it.price) {
      this.message = 'MOEDAS INSUFICIENTES';
      this.msgTimer = 1.6;
      game.audio.sfx('click', { pitch: 0.6 });
      return;
    }
    game.stats.coins -= it.price;
    it.sold = true;
    if (it.kind === 'weapon') {
      game.player.items = game.player.items || [game.player.activeItem];
      if (game.player.items.length < game.player.stats.activeSlots) game.player.items.push(it.id);
      else game.player.items[game.player.items.length - 1] = it.id;
      game.player.activeItem = it.id;
      game.fx.banner(it.name.toUpperCase() + ' EQUIPADO', '#7fe3d4', 1.8, 44);
    } else if (it.kind === 'blessing') {
      game.player.addBlessing(it.data);
      game.save.markBlessing(it.data.id);
      game.fx.banner(it.name.toUpperCase() + '!', RARITY_COLOR[it.data.rarity], 1.8, 44);
    } else if (it.kind === 'heal') {
      game.player.heal(2);
      game.fx.banner('CAFE DUPLO: +2 HP', '#ef5350', 1.6, 44);
    }
    game.audio.sfx('coin');
  }

  draw(ctx, game) {
    if (!this.active) return;
    ctx.fillStyle = 'rgba(10,10,20,0.85)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.font.draw(ctx, 'CANTINA DO PREDIO', VIEW_W / 2, 20, '#81c784', 2, 'center', '#000000');
    this.font.draw(ctx, 'Moedas: ' + game.stats.coins, VIEW_W / 2, 38, '#ffd54f', 1, 'center');

    const w = 88, gap = 10, h = 90;
    const totalW = this.items.length * w + (this.items.length - 1) * gap;
    const startX = VIEW_W / 2 - totalW / 2;
    const y = VIEW_H / 2 - 40;
    this.items.forEach((it, i) => {
      const x = startX + i * (w + gap);
      const sel = i === this.index;
      const affordable = game.stats.coins >= it.price;
      ctx.fillStyle = sel ? '#1e1e30' : '#16162a';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = it.sold ? '#3f3f4d' : sel ? '#ffd54f' : '#5a5a6b';
      ctx.lineWidth = sel ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      const tint = it.kind === 'blessing' ? RARITY_COLOR[it.data.rarity] : it.kind === 'weapon' ? '#7fe3d4' : '#ef5350';
      this.font.draw(ctx, it.kind === 'weapon' ? 'ITEM ATIVO' : it.kind === 'blessing' ? 'BENCAO' : 'CURA',
        x + w / 2, y + 5, tint, 1, 'center');
      if (it.sold) {
        this.font.draw(ctx, 'VENDIDO', x + w / 2, y + 40, '#3f3f4d', 2, 'center');
      } else {
        this.font.wrap(ctx, it.name.toUpperCase(), x + 5, y + 20, w - 10, '#e8e8f0', 1, 9);
        this.font.wrap(ctx, it.desc, x + 5, y + 44, w - 10, '#8f8fa3', 1, 8);
        this.font.draw(ctx, it.price + ' MOEDAS', x + w / 2, y + h - 14, affordable ? '#ffd54f' : '#ef5350', 1, 'center');
      }
    });
    if (this.msgTimer > 0) this.font.draw(ctx, this.message, VIEW_W / 2, VIEW_H - 32, '#ef5350', 1, 'center');
    this.font.draw(ctx, 'E/ENTER comprar   ESC sair', VIEW_W / 2, VIEW_H - 16, '#5a5a6b', 1, 'center');
  }
}
