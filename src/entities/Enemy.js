/**
 * Enemy.js — base de todos os inimigos.
 *
 * IA: maquina de estados finita com os estados
 *   IDLE, PATROL, ALERT, CHASE, TELEGRAPH, ATTACK, RETREAT, HURT, DEAD
 * com transicoes por distancia, linha de visao (LOS) e timers.
 *
 * - LOS por amostragem de tiles (hasLOS)
 * - Pathfinding pelo FlowField da sala (BFS), recalculado a cada 0.35s
 * - Telegrafia obrigatoria antes de todo ataque (0.25s a 0.6s)
 * - Comportamento em grupo: 3+ inimigos se dividem em papeis
 *   (perseguir, flanquear, manter distancia)
 */
import { Entity } from './Entity.js';
import { ENEMY, TILE, TUNING } from '../data/constants.js';
import { dist, hasLOS, moveWithTiles, lerp } from '../core/Physics.js';
import { ENEMIES } from '../data/enemies.js';

export const STATE = {
  IDLE: 'IDLE', PATROL: 'PATROL', ALERT: 'ALERT', CHASE: 'CHASE',
  TELEGRAPH: 'TELEGRAPH', ATTACK: 'ATTACK', RETREAT: 'RETREAT',
  HURT: 'HURT', DEAD: 'DEAD', WANDER: 'WANDER', SUPPORT: 'SUPPORT', SNIPE: 'SNIPE',
};

export class Enemy extends Entity {
  /**
   * @param {string} key chave em ENEMIES
   * @param {number} x @param {number} y
   * @param {object} def ficha ja escalada pelo andar
   */
  constructor(key, x, y, def) {
    super(x, y, {
      w: def.size, h: def.size, radius: def.size * 0.42, hp: def.hp,
      isEnemy: true, type: 'enemy', contactDamage: def.dmg,
      spriteKey: `enemy:${def.sprite}:idle`,
    });
    this.key = key;
    this.def = def;
    this.spriteId = def.sprite;
    this.speed = def.speed;
    this.damage = def.dmg;
    this.arch = def.arch;
    this.sight = def.sight;
    this.atkRange = def.atkRange;
    this.telegraphTime = def.telegraph;
    this.cooldown = def.cooldown;
    this.cooldownTimer = 0;
    this.state = STATE.IDLE;
    this.stateTimer = 0;
    this.telegraphProgress = 0;
    this.posture = 0;
    this.postureMax = def.posture || 24;
    this.executable = false;
    this.execTimer = 0;
    this.role = 'pursue';
    this.path = { x: 0, y: 0 };
    this.pathTimer = Math.random() * ENEMY.pathRefresh;
    this.losTimer = Math.random() * ENEMY.losCheckEvery;
    this.hasLos = false;
    this.spawnAnim = 0.35;
    this.elite = !!def.elite;
    this.big = def.size >= 24;
    this.particlePreset = def.particles || 'paper';
    this.sfx = def.sfx || 'paper';
    this.hitCount = 0;
    this.generation = 0;          // formularios divididos
    this.noPush = false;
    this.blinkTimer = 0;
    this.facing = 1;
    this.wanderDir = { x: 0, y: 0 };
    this.wanderTimer = 0;
    this.attackDone = false;
    this.attackAngle = 0;
    this.scale = def.scale || 1;
    this.spriteKeyBase = `enemy:${def.sprite}:idle`;
    this.spriteKeyIdle = `enemy:${def.sprite}:idle`;
    this.spriteFrame = 0;
    this.executableGlow = 0;
  }

  get animKey() { return `enemy:${this.spriteId}:${this.animAnim}`; }
  get animAnim() {
    const map = { IDLE: 'idle', WANDER: 'idle', PATROL: 'walk', ALERT: 'idle', CHASE: 'walk' };
    if (this.state === STATE.HURT) return 'hurt';
    if (this.state === STATE.DEAD) return 'hurt';
    if (this.state === STATE.TELEGRAPH || this.state === STATE.ATTACK) return this.attackAnimName;
    return map[this.state] || 'idle';
  }
  get attackAnimName() {
    return this.def.arch === 'tank' ? 'shield' : 'attack';
  }

  // ------------------------------------------------------------------ IA
  update(dt, game) {
    this.tickTimers(dt);
    if (this.spawnAnim > 0) this.spawnAnim -= dt;
    if (this.executable) {
      this.execTimer -= dt;
      this.executableGlow = Math.sin(this.time * 12) * 0.5 + 0.5;
      if (this.execTimer <= 0) { this.executable = false; this.posture = 0; }
    } else if (this.posture > 0) {
      this.posture = Math.max(0, this.posture - TUNING.postureDecay * dt);
    }
    if (this.dead) { this.state = STATE.DEAD; return; }

    const player = game.player;
    this.losTimer -= dt;
    if (this.losTimer <= 0) {
      this.losTimer = ENEMY.losCheckEvery;
      this.hasLos = hasLOS(this, player, game.room.map);
    }
    const d = dist(this, player);

    // separacao suave entre inimigos (empurrao)
    this.pathTimer -= dt;

    switch (this.state) {
      case STATE.IDLE:
        this.doIdle(dt, game, d);
        break;
      case STATE.WANDER:
      case STATE.PATROL:
        this.doPatrol(dt, game, d);
        break;
      case STATE.ALERT:
        this.doAlert(dt, game, d);
        break;
      case STATE.CHASE:
        this.doChase(dt, game, d);
        break;
      case STATE.TELEGRAPH:
        this.doTelegraph(dt, game, d);
        break;
      case STATE.ATTACK:
        this.doAttack(dt, game, d);
        break;
      case STATE.RETREAT:
        this.doRetreat(dt, game, d);
        break;
      case STATE.SUPPORT:
        this.doSupport(dt, game, d);
        break;
      case STATE.SNIPE:
        this.doSnipe(dt, game, d);
        break;
      case STATE.HURT:
        this.doHurt(dt, game, d);
        break;
      case STATE.DEAD:
        break;
    }
    this.applyMovement(dt, game);
  }

  setState(s) {
    if (this.state === s) return;
    this.state = s;
    this.stateTimer = 0;
    this.attackDone = false;
    this.animTime = 0;
  }

  /** Mantem distancia preferida do arquetipo. */
  preferredDistance() {
    const p = this.def.preferred || 0;
    if (this.role === 'keepDistance') return p + 26;
    if (this.role === 'flank') return p + 10;
    return p;
  }

  draw(ctx, sprites, game) {
    const key = `enemy:${this.spriteId}:${this.animAnim}`;
    const loop = ['idle', 'walk', 'swarm', 'hop', 'wrap'].includes(this.animAnim);
    const frame = sprites.frameAt(key, this.animTime, loop);
    this.spriteFrame = frame;
    const spawning = this.spawnAnim > 0;
    const alpha = spawning ? 1 - this.spawnAnim / 0.35 : 1;

    // telegraph: aura vermelha piscando + sprite inclinado para tras
    if (this.state === STATE.TELEGRAPH) {
      const t = this.telegraphProgress;
      ctx.save();
      ctx.globalAlpha = 0.25 + t * 0.5;
      ctx.fillStyle = '#ff5252';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 5 + t * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // linha de aviso na direcao do ataque
      ctx.save();
      ctx.globalAlpha = 0.35 + t * 0.4;
      ctx.strokeStyle = '#ff5252';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + Math.cos(this.attackAngle) * (this.atkRange + 10), this.y + Math.sin(this.attackAngle) * (this.atkRange + 10));
      ctx.stroke();
      ctx.restore();
    }
    // executavel: pisca em vermelho
    const flash = this.hitFlash > 0 || (this.executable && this.executableGlow > 0.5);
    sprites.draw(ctx, key, frame, this.x, this.y, {
      flip: this.facing < 0, flash, alpha, scale: this.scale,
    });
    // sombra
    if (!this.spawnAnim) this.drawShadow(ctx, this.w / 2 - 1, 3);
    // vida
    if (this.elite || this.maxHp > 14) this.drawHealthBar(ctx, this.w - 2);
    // postura / execucao
    if (this.posture > 0 && this.postureMax) {
      const pct = this.posture / this.postureMax;
      const w = this.w;
      const y = this.y + this.h / 2 + 3;
      ctx.fillStyle = '#00000088';
      ctx.fillRect(this.x - w / 2, y, w, 2);
      ctx.fillStyle = pct >= 1 ? '#ff5252' : '#ffcf4d';
      ctx.fillRect(this.x - w / 2, y, w * pct, 2);
      if (this.executable) {
        ctx.save();
        ctx.globalAlpha = 0.6 + this.executableGlow * 0.4;
        sprites.draw(ctx, key, frame, this.x, this.y - 14, { flash: true, flip: this.facing < 0, scale: 0.5 });
        ctx.restore();
      }
    }
  }
}

/** Escolhe o estado de combate conforme o arquetipo. */
function pickCombatState(enemy) {
  if (enemy.arch === 'support') return STATE.SUPPORT;
  if (enemy.arch === 'sniper') return STATE.SNIPE;
  return STATE.CHASE;
}

export { ENEMIES };
