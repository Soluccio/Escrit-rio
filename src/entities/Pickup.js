/**
 * Pickup.js — itens de chao: cafe, clipe, toner, moeda, coracao, chave,
 * cracha, pen drive dourado e formulario assinado.
 * Coleta automatica por proximidade (exceto os que precisam de E).
 */
import { PLAYER, TILE } from '../data/constants.js';
import { dist } from '../core/Physics.js';

export const PICKUP_DEFS = {
  coffee: { sprite: 'item:coffee', scale: 1, auto: true, heal: 1, sfx: 'heal', label: 'CAFE' },
  clip:   { sprite: 'item:clip', scale: 1, auto: true, ammo: 8, sfx: 'pickup', label: 'CLIPES' },
  toner:  { sprite: 'item:toner', scale: 1, auto: true, upgrade: true, sfx: 'pickup', label: 'TONER' },
  coin:   { sprite: 'item:coin', scale: 1, auto: true, coins: 1, sfx: 'coin', label: 'MOEDA' },
  heart:  { sprite: 'item:heart', scale: 1, auto: true, heal: 1, maxHp: 1, sfx: 'heal', label: 'CORACAO' },
  key:    { sprite: 'item:key', scale: 1, auto: false, key: true, sfx: 'secret', label: 'CHAVE DO ELEVADOR' },
  badge:  { sprite: 'item:badge', scale: 1, auto: true, badge: true, sfx: 'pickup', label: 'CRACHA DE VENDAS' },
  drive:  { sprite: 'item:drive', scale: 1, auto: true, legendary: true, sfx: 'secret', label: 'PEN DRIVE DOURADO' },
  form:   { sprite: 'item:form', scale: 1, auto: true, signedForm: true, sfx: 'secret', label: 'FORMULARIO ASSINADO' },
};

export class Pickup {
  constructor(kind, x, y, opts = {}) {
    const d = PICKUP_DEFS[kind] || PICKUP_DEFS.coin;
    this.kind = kind;
    this.def = d;
    this.x = x; this.y = y;
    this.vx = opts.vx ?? 0;
    this.vy = opts.vy ?? 0;
    this.radius = 8;
    this.w = 12; this.h = 12;
    this.time = opts.time || 0;
    this.life = opts.life ?? Infinity;    // alguns drops somem
    this.active = true;
    this.bob = opts.bob ?? Math.random() * Math.PI * 2;
    this.amount = opts.amount || 1;
    this.value = opts.value || 0;
    this.magnet = false;
    this.collected = false;
    this.sprites = null;
  }

  get spriteKey() { return this.def.sprite; }

  update(dt, game) {
    this.time += dt;
    if (this.life !== Infinity) {
      this.life -= dt;
      if (this.life <= 0) { this.active = false; return; }
    }
    const player = game.player;
    const d = dist(this, player);
    // coleta automatica por proximidade
    if (this.def.auto && !player.dead && d < PLAYER.pickupRange) {
      this.collect(game, player);
      return;
    }
    // ima leve quando muito perto
    if (this.def.auto && d < PLAYER.pickupRange * 2.6 && !player.dead) {
      const a = Math.atan2(player.y - this.y, player.x - this.x);
      this.x += Math.cos(a) * 90 * dt;
      this.y += Math.sin(a) * 90 * dt;
    }
    if (this.vx || this.vy) {
      const map = game.room.map;
      const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
      if (!map.isSolidAt(nx, this.y)) this.x = nx; else this.vx *= -0.4;
      if (!map.isSolidAt(this.x, ny)) this.y = ny; else this.vy *= -0.4;
      this.vx *= 0.9; this.vy *= 0.9;
      if (Math.abs(this.vx) < 2) this.vx = 0;
      if (Math.abs(this.vy) < 2) this.vy = 0;
    }
  }

  collect(game, player) {
    if (this.collected) return;
    const d = this.def;
    this.collected = true;
    this.active = false;
    if (d.coins) {
      const amount = this.amount || 1;
      game.stats.coins += amount;
      game.stats.coinsEarned += amount;
      game.audio.sfx('coin');
      const hearts = player.addCoinBulk(game.stats.coinsEarned);
      if (hearts > 0) {
        game.fx.banner('+1 CORACAO (100 moedas)', '#ef5350', 1.6, 40);
        game.audio.sfx('heal');
      }
      game.fx.text(this.x, this.y - 8, '+' + amount, '#ffd54f');
      return;
    }
    if (d.heal) {
      const heal = d.heal * player.stats.coffeeHeal;
      const healed = player.heal(heal);
      if (healed > 0) game.audio.sfx('heal');
      else game.fx.text(this.x, this.y - 8, 'VIDA CHEIA', '#8f8fa3');
      game.fx.burst(this.x, this.y, 'paper', { count: 4, speedMult: 0.5 });
      game.fx.text(this.x, this.y - 8, '+' + healed + ' HP', '#ef5350');
      return;
    }
    if (d.maxHp) { player.stats.maxHp += d.maxHp; player.maxHp += d.maxHp; player.hp += d.maxHp; }
    if (d.coins) { }
    if (d.key) {
      game.stats.hasKey = true;
      game.audio.sfx('elevator');
      game.fx.banner('CHAVE DO ELEVADOR!', '#ffcf4d', 2.2, 40);
      return;
    }
    if (d.badge) {
      player.stats.eliteDamage *= 1.15;
      game.audio.sfx('blessing');
      game.fx.banner('CRACHA DE VENDAS: +15% DANO', '#ff9800', 2, 40);
      return;
    }
    if (d.legendary) {
      player.stats.fireRate *= 0.5;
      player.stats.pierce += 1;
      game.audio.sfx('blessing');
      game.fx.banner('PEN DRIVE DOURADO: CADENCIA DOBRADA!', '#ffcf4d', 2.4, 40);
      return;
    }
    if (d.signedForm) {
      player.stats.revives += 1;
      game.audio.sfx('secret');
      game.fx.banner('FORMULARIO ASSINADO: 1 ATAQUE IMUNE', '#b39ddb', 2.2, 40);
      return;
    }
    if (d.ammo) { game.stats.ammo += d.ammo; game.audio.sfx('pickup'); }
    game.audio.sfx(d.sfx || 'pickup');
  }

  draw(ctx, sprites) {
    const info = sprites.info(this.spriteKey);
    const bobY = Math.sin(this.time * 3 + this.bob) * 1.5;
    const frame = info ? sprites.frameAt(this.spriteKey, this.time, true) : 0;
    // brilho sob o item
    if (this.def.legendary || this.def.key) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = this.def.legendary ? '#ffcf4d' : '#ffe082';
      ctx.beginPath();
      ctx.arc(this.x, this.y + 5, 7 + Math.sin(this.time * 5), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    sprites.draw(ctx, this.spriteKey, frame, this.x, this.y + bobY, { scale: this.def.scale });
  }
}

/** Drop aleatorio de inimigo (moeda sempre, extras por chance). */
export function rollDrops(game, enemy, coinBonus = 0) {
  const rng = game.rng;
  const coins = Math.max(1, Math.round((enemy.def.coins || 1) * (game.floorScale?.coins || 1))) + coinBonus;
  for (let i = 0; i < coins; i++) {
    game.spawnPickup('coin', enemy.x + rng.range(-6, 6), enemy.y + rng.range(-6, 6), {
      vx: rng.range(-30, 30), vy: rng.range(-30, 30), life: 22,
    });
  }
  if (rng.chance(0.08)) game.spawnPickup('coffee', enemy.x, enemy.y, { life: 22 });
  if (rng.chance(0.05)) game.spawnPickup('clip', enemy.x, enemy.y, { life: 22 });
  if (rng.chance(0.02)) game.spawnPickup('heart', enemy.x, enemy.y, { life: 22 });
  if (rng.chance(0.01) && game.floorN >= 3) game.spawnPickup('toner', enemy.x, enemy.y, { life: 30 });
}
