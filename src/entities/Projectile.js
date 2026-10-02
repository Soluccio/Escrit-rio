/**
 * Projectile.js — projeteis com pool fixo (sem GC visivel).
 * Tipos: clipe, papel, grampo, caneta, numero, bug, cafe, slide, onda sonora, tinta.
 * Suporta gravidade (arco), perfuracao, homing leve e efeito ao morrer
 * (ex: virar poça de cafe).
 */
import { circleHitsSolid, aabb } from '../core/Physics.js';
import { TILE } from '../data/constants.js';

const POOL_SIZE = 160;

export class Projectile {
  constructor() { this.active = false; }
  reset(o) {
    this.active = true;
    this.kind = o.kind || 'clip';
    this.x = o.x; this.y = o.y;
    this.vx = Math.cos(o.angle || 0) * (o.speed || 100);
    this.vy = Math.sin(o.angle || 0) * (o.speed || 100);
    this.angle = o.angle || 0;
    this.damage = o.damage || 1;
    this.from = o.from || 'player';
    this.pierce = o.pierce || 0;
    this.life = o.life ?? 2.4;
    this.maxLife = this.life;
    this.gravity = o.gravity || 0;
    this.scale = o.scale || 1;
    this.homing = o.homing || 0;
    this.sound = !!o.sound;
    this.delay = o.delay || 0;
    this.onHitGround = o.onHitGround || null;
    this.poolDmg = o.poolDmg || 1;
    this.poolTime = o.poolTime || 3;
    this.radius = o.radius || 3;
    this.hitList = [];
    this.hitsWall = false;
    this.wallBounce = !!o.wallBounce;
    this.paper = !!o.paper;
    this.spin = 0;
    this.animTime = 0;
    this.poolIndex = 0;
  }
  get spriteKey() { return 'item:' + (this.kind === 'clip' ? 'staple' : this.kind); }
}

export class ProjectileSystem {
  constructor(rng, sprites) {
    this.rng = rng;
    this.sprites = sprites;
    this.pool = Array.from({ length: POOL_SIZE }, () => new Projectile());
    this.cursor = 0;
    this.activeList = [];
  }

  get activeCount() { return this.activeList.length; }

  spawn(o) {
    // procura um slot livre (round-robin para nao varrer sempre do inicio)
    for (let i = 0; i < POOL_SIZE; i++) {
      this.cursor = (this.cursor + 1) % POOL_SIZE;
      const p = this.pool[this.cursor];
      if (!p.active) {
        p.reset(o);
        this.activeList.push(p);
        return p;
      }
    }
    return null;   // pool cheio: descarta (protege o frame rate)
  }

  clear() {
    for (const p of this.activeList) p.active = false;
    this.activeList.length = 0;
  }

  update(dt, game) {
    const room = game.room;
    const map = room.map;
    const player = game.player;
    for (let i = this.activeList.length - 1; i >= 0; i--) {
      const p = this.activeList[i];
      if (!p.active) { this.activeList.splice(i, 1); continue; }
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.animTime += dt;
      p.life -= dt;
      p.spin += dt * 12;

      // homing leve (telefone perseguidor do vendedor)
      if (p.homing > 0 && player && !player.dead) {
        const ang = Math.atan2(player.y - p.y, player.x - p.x);
        const cur = Math.atan2(p.vy, p.vx);
        let diff = ang - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const sp = Math.hypot(p.vx, p.vy);
        const na = cur + Math.max(-p.homing * dt, Math.min(p.homing * dt, diff));
        p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
        p.angle = na;
      }
      p.vy += p.gravity * dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;

      // colisao com tiles
      if (circleHitsSolid(nx, ny, p.radius, map)) {
        if (p.wallBounce) {
          if (circleHitsSolid(p.x + p.vx * dt, p.y, p.radius, map)) p.vx *= -1;
          if (circleHitsSolid(p.x, p.y + p.vy * dt, p.radius, map)) p.vy *= -1;
          p.life -= 0.6;
        } else {
          this.onDeath(game, p, nx, ny);
          p.active = false;
          this.activeList.splice(i, 1);
          continue;
        }
      } else {
        p.x = nx; p.y = ny;
      }

      // out of bounds da sala
      if (p.x < -8 || p.y < -8 || p.x > room.w + 8 || p.y > room.h + 8) {
        p.active = false; this.activeList.splice(i, 1); continue;
      }
      if (p.life <= 0) {
        this.onDeath(game, p, p.x, p.y);
        p.active = false; this.activeList.splice(i, 1); continue;
      }

      // ------------------------------------------------------------------ hits
      if (p.from === 'player') {
        for (const e of room.entities) {
          if (e.dead || !e.isEnemy || p.hitList.includes(e.id)) continue;
          if (Math.abs(e.x - p.x) > 16 + p.radius || Math.abs(e.y - p.y) > 16 + p.radius) continue;
          const box = aabb(e);
          if (p.x > box.x - p.radius && p.x < box.x + box.w + p.radius &&
              p.y > box.y - p.radius && p.y < box.y + box.h + p.radius) {
            const res = game.combat.hitEnemy(e, p.damage, { fromX: p.x, fromY: p.y, angle: p.angle });
            p.hitList.push(e.id);
            if (p.sound && e.def?.immuneSound) { /* telefone ignora som */ }
            if (p.pierce > 0) { p.pierce--; }
            else { p.active = false; break; }
          }
        }
        // ...e props (mesas, impressoras) — dano reduzido
        for (const prop of room.props) {
          if (prop.dead || !prop.destructible || prop.broken) continue;
          if (prop.hitsCircle(p.x, p.y, p.radius)) {
            game.combat.hitProp(prop, Math.max(1, Math.round(p.damage * 0.6)));
            if (p.pierce > 0) p.pierce--; else { p.active = false; }
            break;
          }
        }
        // paredes secretas
        if (p.active && game.damageSecretWall(p.x, p.y, p.damage)) {
          p.active = false;
        }
      } else {
        // projeteis inimigos acertam o player
        if (player && !player.dead && player.invuln <= 0) {
          if (Math.abs(player.x - p.x) < 10 && Math.abs(player.y - p.y) < 10) {
            if (game.combat.hitPlayer(p, p.damage, { sound: p.sound })) {
              this.onDeath(game, p, p.x, p.y);
              p.active = false;
            }
          }
        }
        // projeteis inimigos tambem destroem props
        for (const prop of room.props) {
          if (prop.dead || !prop.destructible || prop.broken) continue;
          if (prop.hitsCircle(p.x, p.y, p.radius)) {
            game.combat.hitProp(prop, 1);
            p.active = false;
            break;
          }
        }
      }
      if (!p.active) this.activeList.splice(i, 1);
    }
  }

  /** Ao morrer/expirar: vira poça, some com particula, etc. */
  onDeath(game, p, x, y) {
    if (p.onHitGround === 'coffeePool') {
      game.spawnHazard('coffee', x, y, { radius: p.radius || 22, damage: p.poolDmg, life: p.poolTime, from: null });
      game.fx.burst(x, y, 'coffee', { count: 6 });
      return;
    }
    if (p.from === 'player') game.fx.burst(x, y, 'spark', { count: 3, speedMult: 0.6 });
    else game.fx.burst(x, y, p.kind === 'bugproj' ? 'digital' : 'paper', { count: 3, speedMult: 0.6 });
  }

  draw(ctx) {
    const sprites = this.sprites;
    for (const p of this.activeList) {
      if (!p.active || p.delay > 0) continue;
      const key = p.spriteKey;
      const info = sprites.info(key);
      const frame = info ? sprites.frameAt(key, p.animTime, true) : 0;
      const rot = (p.kind === 'soundwave' || p.kind === 'ink' || p.kind === 'staple') ? 0 : p.angle;
      sprites.draw(ctx, key, frame, p.x, p.y, {
        rot: p.kind === 'slide' || p.kind === 'number' ? 0 : rot,
        flip: false, scale: p.scale,
      });
      // rastro de tinta / cafe
      if (p.kind === 'ink' || p.kind === 'coffeeProj') {
        ctx.globalAlpha = 0.4;
        sprites.draw(ctx, key, frame, p.x - p.vx * 0.02, p.y - p.vy * 0.02, { alpha: 0.4 });
        ctx.globalAlpha = 1;
      }
    }
  }
}
