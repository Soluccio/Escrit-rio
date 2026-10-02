/**
 * Entity.js — base de tudo que vive no mundo: posicao, corpo AABB, vida,
 * timers de flash/knockback e helper de animacao.
 * Nao tem dependencia do Game: quem decide dano e o Combat.js.
 */
import { ENEMY } from '../data/constants.js';

let nextId = 1;

export class Entity {
  constructor(x, y, opts = {}) {
    this.id = nextId++;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.w = opts.w || 12;
    this.h = opts.h || 14;
    this.radius = opts.radius || Math.max(this.w, this.h) / 2;
    this.maxHp = opts.hp || 10;
    this.hp = this.maxHp;
    this.dead = false;
    this.isEnemy = !!opts.isEnemy;
    this.isPlayer = !!opts.isPlayer;
    this.facing = -1;             // -1 esquerda, 1 direita
    this.aimAngle = 0;
    this.time = 0;                // tempo de vida (animacoes)
    this.animTime = 0;            // tempo da animacao atual
    this.anim = opts.anim || 'idle';
    this.hitFlash = 0;            // flash branco
    this.invuln = 0;              // invencibilidade
    this.knockVX = 0; this.knockVY = 0;
    this.stun = 0;
    this.deathTimer = 0;
    this.spriteKey = opts.spriteKey || 'enemy:papel:idle';
    this.contactDamage = opts.contactDamage || 0;
    this.scale = opts.scale || 1;
    this.noPush = false;
    this.type = opts.type || 'entity';
  }

  get healthPct() { return this.maxHp ? Math.max(0, this.hp / this.maxHp) : 0; }

  /** Troca de animacao (reinicia o timer se mudou). */
  setAnim(name) {
    if (this.anim === name) return;
    this.anim = name;
    this.animTime = 0;
  }

  /** Avanca timers comuns. */
  tickTimers(dt) {
    this.time += dt;
    this.animTime += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.stun > 0) this.stun -= dt;
    if (this.deathTimer > 0) this.deathTimer -= dt;
  }

  /** Aplica knockback (decai sozinho). */
  applyKnockback(angle, force) {
    this.knockVX += Math.cos(angle) * force;
    this.knockVY += Math.sin(angle) * force;
  }

  /** Aplica o knockback no movimento (chamado pelos filhos no update). */
  integrateKnockback(dt) {
    if (!this.knockVX && !this.knockVY) return { x: 0, y: 0 };
    const dx = this.knockVX * dt, dy = this.knockVY * dt;
    const decay = Math.pow(0.0001, dt);
    this.knockVX *= decay; this.knockVY *= decay;
    if (Math.abs(this.knockVX) < 2) this.knockVX = 0;
    if (Math.abs(this.knockVY) < 2) this.knockVY = 0;
    return { x: dx, y: dy };
  }

  hurtFlash() { this.hitFlash = 0.1; }

  /** Verifica se a entidade deve morrer (vida <= 0). */
  get shouldDie() { return this.hp <= 0 && !this.dead; }

  distanceTo(other) { return Math.hypot(this.x - other.x, this.y - other.y); }
  angleTo(other) { return Math.atan2(other.y - this.y, other.x - this.x); }

  /** Direcao cardinal para escolher sprite (nao usado para rotacao). */
  faceTowards(x) { this.facing = x < this.x ? -1 : 1; }

  drawSprite(ctx, sprites, key, frame, opts = {}) {
    sprites.draw(ctx, key || this.spriteKey, frame, this.x, this.y, {
      flip: this.facing > 0 ? false : true,
      flash: this.hitFlash > 0,
      alpha: opts.alpha ?? 1,
      scale: opts.scale ?? this.scale,
      rot: opts.rot,
    });
  }

  /** Sombra padrao no chao. */
  drawShadow(ctx, rx = null, ry = null) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.h / 2 - 1, rx ?? this.w / 2, ry ?? Math.max(2, this.w / 5), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Barra de vida pequena (usada por elites e bosses). */
  drawHealthBar(ctx, w = 18, yOff = null) {
    const pct = this.healthPct;
    const y = this.y - (yOff ?? this.h / 2 + 6);
    ctx.fillStyle = '#00000099';
    ctx.fillRect(this.x - w / 2 - 1, y - 1, w + 2, 4);
    ctx.fillStyle = '#2b2b3d';
    ctx.fillRect(this.x - w / 2, y, w, 2);
    ctx.fillStyle = pct > 0.5 ? '#7fe3d4' : pct > 0.25 ? '#ffd54f' : '#ef5350';
    ctx.fillRect(this.x - w / 2, y, w * pct, 2);
  }
}

export const HURT_TIME = ENEMY.hurtTime;
