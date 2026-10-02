/**
 * Boss.js — base dos chefes (5 mini-bosses + CEO).
 *
 * Estrutura:
 *  - INTRO: fala de entrada no topo da tela + zoom da camera + musica propria
 *  - FIGHT: escolhe um ataque, telegrafa e executa (timeline de passos)
 *  - STAGGER: 2s de vulnerabilidade ao chegar em marcos de vida
 *  - PHASE: troca de fase (2 ou 3 fases conforme o chefe)
 *  - FURY: ataque especial abaixo de 20% de vida
 *  - DEAD: slow motion, kanji e recompensa
 *
 * Cada chefe implementa seus ataques como metodos attack_<nome>(game, t).
 */
import { Entity } from '../Entity.js';
import { BOSS, CAMERA } from '../../data/constants.js';
import { lerp } from '../../core/Physics.js';
import { DEATH_LINES } from '../../data/bosses.js';

export const PHASE_STATE = {
  INTRO: 'INTRO', FIGHT: 'FIGHT', TELEGRAPH: 'TELEGRAPH', EXEC: 'EXEC',
  RECOVER: 'RECOVER', STAGGER: 'STAGGER', PHASE: 'PHASE', FURY: 'FURY', DEAD: 'DEAD',
};

export class Boss extends Entity {
  constructor(def, x, y, scale = null) {
    super(x, y, {
      w: def.size * 0.7, h: def.size * 0.7, radius: def.size * 0.36,
      hp: scale ? Math.round(def.hp * scale.hp) : def.hp,
      isEnemy: true, type: 'boss', spriteKey: `boss:${def.id}:idle`,
    });
    this.def = def;
    this.bossId = def.id;
    this.isBoss = true;
    this.big = true;
    this.damage = scale ? def.dmg + scale.damage - 1 : def.dmg;
    this.speed = scale ? def.speed * scale.speed : def.speed;
    this.contactDash = 0;
    this.phase = 1;
    this.state = PHASE_STATE.INTRO;
    this.stateTimer = 0;
    this.attackCooldown = 1.0;
    this.currentAttack = null;
    this.script = [];
    this.scriptTime = 0;
    this.scriptDuration = 1;
    this.scriptStep = 0;
    this.fury = false;
    this.postureMax = 200;
    this.posture = 0;
    this.executable = false;
    this.facing = -1;
    this.scale = 1;
    this.staggerCount = 0;
    this.dialogueShown = false;
    this.deathAnim = 0;
    this.deathDone = false;
    this.telegraphTime = 0.5;
    this.telegraphProgress = 0;
    this.spriteKeyIdle = `boss:${def.id}:idle`;
    this.particlePreset = 'spark';
    this.sfx = 'bossHorn';
    this.hitList = [];
  }

  get animAnim() {
    if (this.state === PHASE_STATE.DEAD) return 'death';
    if (this.state === PHASE_STATE.STAGGER) return 'stagger';
    if (this.state === PHASE_STATE.TELEGRAPH || this.state === PHASE_STATE.EXEC) return 'attack';
    if (this.state === PHASE_STATE.PHASE) return this.phase >= 3 ? 'phase3' : 'phase2';
    if (this.phase >= 3 && this.def.phases.includes(3)) return 'phase3';
    if (this.phase >= 2) return this.def.phases.includes(2) ? 'phase2' : 'idle';
    return 'idle';
  }

  get animKey() { return `boss:${this.bossId}:${this.animAnim}`; }

  /** Inicia a luta: fala, musica e zoom. */
  start(game) {
    game.audio.music(this.def.music);
    game.audio.sfx(this.def.mini ? 'bossHorn' : 'ceoRoar');
    game.camera.targetZoom = CAMERA.zoomBoss;
    game.camera.addShake(BOSS.shakeBoss || 5);
    game.dialogue.show(this.def.name, this.def.intro, BOSS.dialogueTime);
    game.fx.banner(this.def.name, this.def.color, 2.6, 22);
    this.state = PHASE_STATE.INTRO;
    this.stateTimer = 0;
  }

  update(dt, game) {
    this.tickTimers(dt);
    if (this.dead) return;
    const player = game.player;
    this.stateTimer += dt;
    if (this.executable) {
      this.execTimer -= dt;
      if (this.execTimer <= 0) { this.executable = false; this.posture = 0; }
    } else if (this.posture > 0) this.posture = Math.max(0, this.posture - 4 * dt);

    switch (this.state) {
      case PHASE_STATE.INTRO:
        this.vx *= 0.9; this.vy *= 0.9;
        if (this.stateTimer > BOSS.dialogueTime) this.setState(PHASE_STATE.FIGHT);
        break;
      case PHASE_STATE.FIGHT:
        this.fightUpdate(dt, game, player);
        break;
      case PHASE_STATE.TELEGRAPH:
        this.telegraphProgress += dt / this.telegraphTime;
        this.facePlayer(player);
        if (this.telegraphProgress >= 1) this.beginExec(game);
        break;
      case PHASE_STATE.EXEC:
        this.scriptTime += dt;
        this.runScript(game);
        if (this.scriptTime >= this.scriptDuration) {
          this.setState(PHASE_STATE.RECOVER);
          this.attackCooldown = Math.max(0.35, this.currentAttackCooldown || 1.1) * game.rng.range(0.85, 1.1);
        }
        break;
      case PHASE_STATE.RECOVER:
        this.vx *= 0.92; this.vy *= 0.92;
        this.attackCooldown -= dt;
        if (this.attackCooldown <= 0) this.chooseAttack(game, player);
        break;
      case PHASE_STATE.STAGGER:
        this.vx *= 0.9; this.vy *= 0.9;
        if (this.stateTimer > 2.0) { this.setState(PHASE_STATE.FIGHT); this.attackCooldown = 0.4; }
        break;
      case PHASE_STATE.PHASE:
        this.vx *= 0.9; this.vy *= 0.9;
        if (this.stateTimer > 1.2) { this.setState(PHASE_STATE.FIGHT); this.attackCooldown = 0.3; }
        break;
      case PHASE_STATE.DEAD:
        this.deathAnim += dt;
        break;
    }
    this.applyMovement(dt, game);
  }

  setState(s) { this.state = s; this.stateTimer = 0; }

  facePlayer(player) {
    const a = Math.atan2(player.y - this.y, player.x - this.x);
    this.attackAngle = a;
    this.facing = Math.cos(a) < 0 ? -1 : 1;
  }

  /** Movimento: persegue mantendo distancia de combate. */
  fightUpdate(dt, game, player) {
    this.attackCooldown -= dt;
    const d = Math.hypot(player.x - this.x, player.y - this.y);
    this.facePlayer(player);
    const desired = this.def.mini ? 70 : 80;
    if (d > desired + 12) this.moveToward(player, this.speed, dt);
    else if (d < desired - 24) {
      const a = Math.atan2(this.y - player.y, this.x - player.x);
      this.vx = lerp(this.vx, Math.cos(a) * this.speed * 0.7, 0.1);
      this.vy = lerp(this.vy, Math.sin(a) * this.speed * 0.7, 0.1);
    } else {
      // orbita o player (movimento lateral)
      const a = Math.atan2(this.y - player.y, this.x - player.x) + 0.6;
      this.vx = lerp(this.vx, Math.cos(a) * this.speed * 0.6, 0.08);
      this.vy = lerp(this.vy, Math.sin(a) * this.speed * 0.6, 0.08);
    }
    if (this.attackCooldown <= 0 && this.state === PHASE_STATE.FIGHT) this.chooseAttack(game, player);
  }

  moveToward(target, speed, dt) {
    const a = Math.atan2(target.y - this.y, target.x - this.x);
    this.vx = lerp(this.vx, Math.cos(a) * speed, 0.08);
    this.vy = lerp(this.vy, Math.sin(a) * speed, 0.08);
  }

  applyMovement(dt, game) {
    const map = game.room?.map;
    if (!map) return;
    const kb = this.integrateKnockback(dt);
    const nx = this.x + (this.vx + kb.x) * dt;
    const ny = this.y + (this.vy + kb.y) * dt;
    if (!map.boxHitsSolid(nx - this.w / 2, this.y - this.h / 2, this.w, this.h)) this.x = nx;
    else this.vx *= -0.2;
    if (!map.boxHitsSolid(this.x - this.w / 2, ny - this.h / 2, this.w, this.h)) this.y = ny;
    else this.vy *= -0.2;
    const room = game.room;
    this.x = Math.max(this.w, Math.min(room.w - this.w, this.x));
    this.y = Math.max(this.h, Math.min(room.h - this.h, this.y));
  }

  /** Escolhe o proximo ataque: furia > fase atual. */
  chooseAttack(game, player) {
    if (this.fury) {
      const furyName = this.furyAttack || this.def.attacks[this.def.attacks.length - 1];
      if (furyName && this['attack_' + furyName]) {
        this.startAttack(furyName, game);
        return;
      }
    }
    const pool = this.attackPool(game);
    const name = game.rng.pick(pool);
    this.startAttack(name, game);
  }

  /** Ataques disponiveis conforme a fase (sobrescrito pelos chefes). */
  attackPool(game) {
    const a = this.def.attacks;
    if (this.phase === 1) return a.slice(0, Math.max(1, Math.ceil(a.length / 2)));
    return a;
  }

  /** Prepara o ataque: telelefrafia, depois executa o script. */
  startAttack(name, game) {
    const method = this['attack_' + name];
    if (!method) { this.setState(PHASE_STATE.RECOVER); return; }
    const def = method.call(this, game, null, true) || {};
    this.currentAttack = name;
    this.currentAttackCooldown = def.cooldown || 1.2;
    this.telegraphTime = def.telegraph || 0.5;
    this.script = def.script || [];
    this.scriptDuration = def.duration || 1.0;
    this.scriptTime = 0;
    this.scriptStep = 0;
    this.pendingAttack = name;
    this.telegraphProgress = 0;
    this.setState(def.noTelegraph ? PHASE_STATE.EXEC : PHASE_STATE.TELEGRAPH);
    if (def.noTelegraph) { this.runScript(game); }
    game.audio.sfx(def.sfx || 'click', { pitch: 0.7, volume: 0.2 });
  }

  beginExec(game) {
    this.setState(PHASE_STATE.EXEC);
    this.scriptTime = 0;
    this.scriptStep = 0;
  }

  /** Executa os passos do script conforme o tempo. */
  runScript(game) {
    while (this.scriptStep < this.script.length && this.script[this.scriptStep].at <= this.scriptTime) {
      const step = this.script[this.scriptStep++];
      step.fn(game);
    }
  }

  /** Dano no chefe: checa fase, stagger e execucao. */
  onHit(dmg, opts) {
    const pct = this.hp / this.maxHp;
    if (!this.fury && pct <= BOSS.furyThreshold) {
      this.fury = true;
      this.game?.fx.banner?.('FÚRIA: ' + (this.def.name), '#ff5252', 2, 46);
    }
    const thresholds = this.def.phases.filter(p => p > 1);
    const nextPhase = this.phase + 1;
    if (this.def.phases.includes(nextPhase) && pct <= (1 / nextPhase) && this.state !== PHASE_STATE.PHASE) {
      this.phase = nextPhase;
      this.setState(PHASE_STATE.PHASE);
      this.script = []; this.scriptStep = 0;
      this.stateTimer = 0;
      this.staggerCount++;
      const game = this.game;
      if (game) {
        game.fx.freezeFrame(0.12);
        game.fx.banner(`FASE ${this.phase}`, this.def.color, 1.8, 44);
        game.camera.addShake(5);
        game.audio.sfx('bossHorn');
      }
    }
  }

  /** Vida zerada: solta a morte cinematografica. */
  die(game) {
    if (this.dead) return;
    this.dead = true;
    this.state = PHASE_STATE.DEAD;
    this.deathAnim = 0;
    this.vx = this.vy = 0;
    game.onBossDefeated(this);
  }

  draw(ctx, sprites, game) {
    const key = this.animKey;
    const frame = sprites.frameAt(key, this.animTime, this.animAnim !== 'death' && this.animAnim !== 'stagger');
    // telegraph: aura no chao
    if (this.state === PHASE_STATE.TELEGRAPH || this.state === PHASE_STATE.EXEC) {
      const t = this.state === PHASE_STATE.TELEGRAPH ? this.telegraphProgress : 1;
      ctx.save();
      ctx.globalAlpha = 0.18 + t * 0.22;
      ctx.fillStyle = this.def.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 10 + t * 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (this.state === PHASE_STATE.STAGGER || this.executable) {
      ctx.save();
      ctx.globalAlpha = 0.5 + Math.sin(this.time * 14) * 0.3;
      ctx.fillStyle = '#ff5252';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const alpha = this.state === PHASE_STATE.INTRO ? Math.min(1, this.stateTimer / 0.5) : 1;
    this.drawShadow(ctx, this.w / 2 + 2, 4);
    sprites.draw(ctx, key, frame, this.x, this.y, {
      flip: this.facing > 0, flashSoft: this.hitFlash > 0 ? 0.6 : 0, alpha, scale: this.scale,
    });
    // barra de vida dedicada fica no HUD (ver ui/HUD.js), aqui so a postura
    if (this.posture > 0 && !this.dead) {
      const w = this.w + 10, pct = this.posture / this.postureMax;
      const y = this.y + this.h / 2 + 6;
      ctx.fillStyle = '#00000088'; ctx.fillRect(this.x - w / 2, y, w, 3);
      ctx.fillStyle = this.executable ? '#ff5252' : '#ffcf4d';
      ctx.fillRect(this.x - w / 2 + 1, y + 1, (w - 2) * pct, 1);
    }
  }
}
