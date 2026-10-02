/**
 * Hazard.js — zonas de perigo no chao (poças de cafe, ondas de choque, zonas de
 * pergunta, pingos, empurrao, lentidao). Todos os hazards tem tempo de vida,
 * dano e um visual proprio, e sao resolvidos contra o player.
 */
import { dist } from '../core/Physics.js';

export const HAZARD_DEFS = {
  coffee:  { color: '#5d4037', radius: 18, dmgTick: 0.5, damage: 1, visual: 'pool', slow: 0.85 },
  shock:   { color: '#b0bec5', radius: 30, dmgTick: 0, damage: 1, visual: 'ring', once: true },
  question:{ color: '#b39ddb', radius: 20, dmgTick: 0, damage: 1, visual: 'zone', once: true, root: 1.2 },
  drip:    { color: '#8d6e63', radius: 14, dmgTick: 0, damage: 1, visual: 'drip', once: true },
  push:    { color: '#dce7ff', radius: 34, dmgTick: 0, damage: 0, visual: 'push', once: true, push: 260 },
  slow:    { color: '#78909c', radius: 30, dmgTick: 0, damage: 0, visual: 'goo', slow: 0.45, once: false },
  digital: { color: '#00e676', radius: 40, dmgTick: 0.4, damage: 1, visual: 'glitch' },
  ink:     { color: '#3f51b5', radius: 12, dmgTick: 0.35, damage: 1, visual: 'ink' },
};

export class Hazard {
  constructor(kind, x, y, opts = {}) {
    const def = HAZARD_DEFS[kind] || HAZARD_DEFS.coffee;
    this.kind = kind;
    this.def = def;
    this.x = x; this.y = y;
    this.radius = opts.radius || def.radius;
    this.damage = opts.damage ?? def.damage;
    this.life = opts.life ?? 4;
    this.maxLife = this.life;
    this.delay = opts.delay || 0;         // telegraph antes de ativar
    this.from = opts.from || null;
    this.visual = opts.visual || def.visual;
    this.slow = opts.slow ?? def.slow ?? 1;
    this.root = opts.root || def.root || 0;
    this.push = opts.push || def.push || 0;
    this.propagate = opts.propagate || null;   // {x,y,speed} onda que anda
    this.tickTimer = 0;
    this.fired = false;
    this.dead = false;
    this.time = 0;
    this.anim = 0;
    this.active = false;                  // liga depois do delay
  }

  update(dt, game) {
    this.time += dt;
    this.anim += dt;
    if (this.delay > 0) {
      this.delay -= dt;
      if (this.delay <= 0) this.active = true;
      return;
    }
    this.active = true;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (this.propagate) {
      this.x += this.propagate.x * this.propagate.speed * dt;
      this.y += this.propagate.y * this.propagate.speed * dt;
      if (game.room.map.isSolidAt(this.x, this.y)) this.dead = true;
    }
    const player = game.player;
    if (!player || player.dead) return;
    const d = dist(this, player);
    const inside = d < this.radius + player.radius;

    if (this.kind === 'shock' || this.kind === 'push' || this.visual === 'ring') {
      if (!this.fired && inside) {
        this.fired = true;
        if (this.damage > 0 && !this.slowImmune) game.combat.hitPlayer(this, this.damage, {});
        if (this.push) {
          const a = Math.atan2(player.y - this.y, player.x - this.x);
          player.applyKnockback(a, this.push);
        }
        if (this.root) player.rootTimer = Math.max(player.rootTimer || 0, this.root);
      }
      return;
    }
    if (this.kind === 'question' || this.kind === 'drip') {
      if (!this.fired) {
        this.fired = true;
        if (this.kind === 'question') {
          game.fx.burst(this.x, this.y, 'ink', { count: 8 });
          game.audio.sfx('click');
          if (inside) {
            player.rootTimer = Math.max(player.rootTimer || 0, this.root);
            game.combat.hitPlayer(this, this.damage, {});
          }
        } else {
          game.fx.burst(this.x, this.y, 'coffee', { count: 6 });
          game.audio.sfx('coffee');
          if (inside) game.combat.hitPlayer(this, this.damage, {});
        }
      }
      return;
    }
    // hazards persistentes: dano por tick + slow
    if (inside) {
      if (this.slow < 1) player.slowTimer = Math.max(player.slowTimer || 0, 0.15);
      if (this.slow < 1 && !player.slowFactor) player.slowFactor = this.slow;
      this.tickTimer -= dt;
      if (this.tickTimer <= 0 && this.damage > 0) {
        this.tickTimer = this.def.dmgTick || 0.5;
        game.combat.hitPlayer(this, this.damage, {});
      }
      if (this.kind === 'ink') {
        // tinta do marca-texto tambem machuca inimigos
        for (const e of game.room.entities) {
          if (e.dead || !e.isEnemy) continue;
          if (dist(this, e) < this.radius + e.radius) {
            this.enemyTick = (this.enemyTick || 0) - dt;
            if (this.enemyTick <= 0) {
              this.enemyTick = 0.4;
              game.combat.hitEnemy(e, this.damage, { noKnock: true, noCrit: true });
            }
          }
        }
      }
    }
  }

  draw(ctx) {
    const t = this.time;
    ctx.save();
    if (this.delay > 0) {
      // telegraph: circulo tracejado que fecha
      ctx.globalAlpha = 0.35 + Math.sin(t * 20) * 0.15;
      ctx.strokeStyle = '#ff5252';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = this.def.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * (1 - this.delay / Math.max(0.001, this.delay + 0.4)), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    const fade = Math.min(1, this.life / Math.max(0.3, this.maxLife * 0.3));
    switch (this.visual) {
      case 'pool': {
        ctx.globalAlpha = 0.85 * fade;
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8d6e63';
        ctx.beginPath();
        ctx.ellipse(this.x - 2, this.y - 1, this.radius * 0.7, this.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // borbulhas
        ctx.fillStyle = '#e8e8f0';
        for (let i = 0; i < 3; i++) {
          const bx = this.x + Math.sin(t * 2 + i * 2) * (this.radius * 0.4);
          const by = this.y + Math.cos(t * 1.6 + i) * (this.radius * 0.25);
          ctx.fillRect(bx, by, 1, 1);
        }
        break;
      }
      case 'ring': {
        const p = 1 - this.life / this.maxLife;
        ctx.globalAlpha = (1 - p) * 0.9;
        ctx.strokeStyle = this.def.color;
        ctx.lineWidth = 3 - p * 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * p, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'zone': {
        ctx.globalAlpha = 0.5 * fade;
        ctx.fillStyle = this.def.color;
        ctx.fillRect(this.x - this.radius, this.y - this.radius * 0.6, this.radius * 2, this.radius * 1.2);
        ctx.fillStyle = '#12121f';
        ctx.fillRect(this.x - 2, this.y - 6, 4, 6);
        ctx.fillRect(this.x - 1, this.y + 2, 2, 3);
        break;
      }
      case 'drip': {
        ctx.globalAlpha = 0.7 * fade;
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(this.x - 1, this.y - 14, 2, 14);
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'goo': {
        ctx.globalAlpha = 0.4 * fade;
        ctx.fillStyle = '#78909c';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'glitch': {
        ctx.globalAlpha = 0.5 * fade;
        ctx.fillStyle = '#00e676';
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + t;
          ctx.fillRect(this.x + Math.cos(a) * this.radius * 0.7, this.y + Math.sin(a) * this.radius * 0.5, 2, 2);
        }
        ctx.fillStyle = '#00e67633';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * 0.8, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'ink': {
        ctx.globalAlpha = 0.75 * fade;
        ctx.fillStyle = '#3f51b5';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'push': {
        ctx.globalAlpha = (1 - this.time / this.maxLife) * 0.5;
        ctx.strokeStyle = '#dce7ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * (this.time / this.maxLife), 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      default: {
        ctx.globalAlpha = 0.5 * fade;
        ctx.fillStyle = this.def.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
}

/** Sistema de hazards da sala (pool simples por array, sala limpa reseta). */
export class HazardSystem {
  constructor(rng) { this.rng = rng; this.list = []; }
  spawn(kind, x, y, opts = {}) {
    const h = new Hazard(kind, x, y, opts);
    this.list.push(h);
    if (this.list.length > 60) this.list.shift();
    return h;
  }
  update(dt, game) {
    for (const h of this.list) h.update(dt, game);
    this.list = this.list.filter(h => !h.dead);
  }
  draw(ctx) { for (const h of this.list) h.draw(ctx); }
  clear() { this.list.length = 0; }
}
