/**
 * Player.js — Max, o estagiario.
 * Movimento top-down com aceleracao/atrito e coyote de input, dash com
 * invencibilidade e rastro de fantasmas, ataque primario (clipes), ataque
 * secundario (item ativo), coleta automatica e interacao com E.
 */
import { Entity } from './Entity.js';
import { playerFire, playerUseSecondary } from './PlayerAttacks.js';
import { PLAYER, TILE, TUNING } from '../data/constants.js';
import { clamp, lerp, moveWithTiles, dist } from '../core/Physics.js';
import { CHAR_BY_ID } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { startingItem } from '../data/items.js';

/** Stats base do player, modificaveis por bencaos durante a run. */
export function baseStats(characterId = 'max') {
  const ch = CHAR_BY_ID[characterId] || CHAR_BY_ID.max;
  return {
    character: ch.id,
    maxHp: PLAYER.maxHp + ch.hp,
    speed: PLAYER.speed * ch.speed,
    accel: PLAYER.accel,
    friction: PLAYER.friction,
    damage: (ch.damage || 1),
    clipDamage: PLAYER.clipDamage,
    fireRate: 1,
    shots: 1,
    pierce: 0,
    critChance: PLAYER.critChance,
    critMult: PLAYER.critMult,
    dashCharges: 1,
    dashCooldown: PLAYER.dashCooldown,
    hurtInvuln: PLAYER.invulnAfterHurt,
    projSpeed: 1,
    coffeeHeal: 1,
    eliteDamage: 1,
    activeSlots: 1,
    revealAdjacent: false,
    soundImmune: false,
    trailDamage: 0,
    revives: 0,
    healOnPickup: 0,
    healOnKillEvery: ch.special === 'healOnKill' ? 10 : 0,
    undoDamage: ch.special === 'undoDamage',
    undoAvailable: ch.special === 'undoDamage',
    undoCooldown: 0,
    coffeeEveryKill: 0,
    floorHpBonus: 0,
    furyTimer: 0,
    blessings: [],       // {id, name, rarity}
  };
}

export class Player extends Entity {
  constructor(x, y, characterId = 'max') {
    const stats = baseStats(characterId);
    super(x, y, {
      w: PLAYER.w, h: PLAYER.h, radius: PLAYER.radius, hp: stats.maxHp,
      isPlayer: true, type: 'player', contactDamage: 0,
    });
    this.stats = stats;
    this.maxHp = stats.maxHp;
    this.hp = stats.maxHp;
    this.anim = 'idle';
    this.facing = 1;
    this.speed = stats.speed;
    this.aimAngle = 0;
    this.dashing = false;
    this.dashTime = 0;
    this.dashCooldown = 0;
    this.dashCharges = stats.dashCharges;
    this.dashDir = { x: 1, y: 0 };
    this.dashGhostTimer = 0;
    this.ghostsLeft = 0;
    this.fireCooldown = 0;
    this.secondaryCooldown = 0;
    this.activeItem = startingItem(characterId);
    this.furyTimer = 0;
    this.hurtTimer = 0;
    this.dead = false;
    this.deathTimer = 0;
    this.pickupAnim = 0;
    this.coinsCollected = 0;
    this.hpBonusApplied = 0;
    this.trailTimer = 0;
    this.lastMoveDir = { x: 1, y: 0 };
    this.coyote = 0;         // "coyote de input": lembra a direcao por alguns ms
    this.coyoteDir = { x: 0, y: 0 };
    this.interactTarget = null;
    this.rootTimer = 0;
    this.slowTimer = 0;
    this.slowFactor = 0.5;
    this.squash = 1;
    this.attackAnim = 0;
    this.wallSlide = { x: false, y: false };
  }

  get spriteKeyPrefix() { return 'player:' + this.stats.character; }

  /** Direcao de mira a partir do input global. */
  updateAim(input, camera) {
    const aim = input.aim();
    if (!aim) return;
    if (aim.source === 'mouse') {
      const w = camera.screenToWorld(aim.x, aim.y);
      this.aimAngle = Math.atan2(w.y - this.y, w.x - this.x);
    } else if (aim.source === 'touch' || aim.source === 'pad') {
      this.aimAngle = Math.atan2(aim.y, aim.x);
    } else if (aim.source === 'rel') {
      this.aimAngle = Math.atan2(aim.y, aim.x);
    }
  }

  /** Aplica bencao: chama apply() e registra para a UI. */
  addBlessing(blessing) {
    const before = this.maxHp;
    blessing.apply(this.stats);
    this.stats.blessings.push({ id: blessing.id, name: blessing.name, rarity: blessing.rarity, icon: blessing.icon });
    this.maxHp = this.stats.maxHp;
    if (this.maxHp > before) { this.hp += this.maxHp - before; }
    this.hp = Math.min(this.hp, this.maxHp);
    if (this.stats.healOnPickup) { this.heal(this.stats.healOnPickup); this.stats.healOnPickup = 0; }
    this.dashCharges = Math.max(this.dashCharges, this.stats.dashCharges);
  }

  heal(amount) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }

  /** +1 coracao por 100 moedas. */
  addCoinBulk(total) {
    const hearts = Math.floor(total / PLAYER.coinHeartEvery);
    if (hearts > this.hpBonusApplied) {
      const gain = hearts - this.hpBonusApplied;
      this.hpBonusApplied = hearts;
      this.stats.maxHp += gain;
      this.maxHp += gain;
      this.hp += gain;
      return gain;
    }
    return 0;
  }

  /** Aplica bonus de vida no inicio do andar (bencao Cadeira Ergonômica). */
  onFloorStart() {
    if (this.stats.floorHpBonus) {
      this.stats.maxHp += this.stats.floorHpBonus;
      this.maxHp = this.stats.maxHp;
      this.hp += this.stats.floorHpBonus;
    }
  }

  /** Dash: rola com invencibilidade e deixa rastro de 4 fantasmas. */
  tryDash(dirX, dirY) {
    if (this.dashCooldown > 0 || this.dashCharges <= 0 || this.dashing) return false;
    const len = Math.hypot(dirX, dirY);
    if (len < 0.1) return false;
    this.dashDir = { x: dirX / len, y: dirY / len };
    this.dashing = true;
    this.dashTime = PLAYER.dashTime;
    this.dashCooldown = this.stats.dashCooldown;
    this.invuln = Math.max(this.invuln, PLAYER.dashInvuln);
    this.ghostsLeft = PLAYER.dashGhosts;
    this.dashGhostTimer = 0;
    this.setAnim('dash');
    this.squash = 1.35;
    return true;
  }

  update(dt, game) {
    this.tickTimers(dt);
    const input = game.input;
    const room = game.room;
    const map = room ? room.map : game.floor.map;

    if (this.dead) {
      this.deathTimer += dt;
      this.setAnim('death');
      return;
    }

    // timers
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.secondaryCooldown > 0) this.secondaryCooldown -= dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.pickupAnim > 0) this.pickupAnim -= dt;
    if (this.stats.undoCooldown > 0) {
      this.stats.undoCooldown -= dt;
      if (this.stats.undoCooldown <= 0) { this.stats.undoAvailable = true; }
    }
    if (this.stats.furyTimer > 0) this.stats.furyTimer -= dt;

    this.updateAim(input, game.camera);

    // ---------------------------------------------------------- movimento
    let axis = game.axis ? game.axis() : input.axis();
    // atordoado / enraizado (zonas de pergunta da Entrevistadora)
    if (this.rootTimer > 0) {
      this.rootTimer -= dt;
      axis = { x: 0, y: 0, len: 0 };
    }
    // lentidao (cabo emaranhado)
    let speedMult = 1;
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      speedMult = this.slowFactor || 0.5;
    }
    if (axis.len > 0.1) {
      this.lastMoveDir = { x: axis.x, y: axis.y };
      this.coyote = 0.12;
    } else if (this.coyote > 0) {
      this.coyote -= dt;
      axis.x = this.lastMoveDir.x * 0.6; axis.y = this.lastMoveDir.y * 0.6;
      axis.len = 0.6;
    }

    if (this.dashing) {
      this.dashTime -= dt;
      const spd = PLAYER.dashSpeed * (this.stats.speed / PLAYER.speed) * speedMult;
      const moved = moveWithTiles(this, this.dashDir.x * spd * dt, this.dashDir.y * spd * dt, map);
      this.wallSlide = moved;
      // rastro de fantasmas
      this.dashGhostTimer -= dt;
      if (this.dashGhostTimer <= 0 && this.ghostsLeft > 0) {
        this.ghostsLeft--;
        this.dashGhostTimer = PLAYER.dashTime / PLAYER.dashGhosts;
        game.fx.ghost(this.spriteKeyPrefix + ':dash', 0, this.x, this.y, this.facing < 0);
      }
      if (this.dashTime <= 0) this.dashing = false;
    } else {
      // aceleracao + atrito + coyote
      const accel = (this.stats.accel * (axis.len || 0)) * speedMult;
      if (axis.len > 0.05) {
        this.vx += axis.x * accel * dt;
        this.vy += axis.y * accel * dt;
      } else {
        const sp = Math.hypot(this.vx, this.vy);
        if (sp > 0) {
          const drop = Math.min(sp, this.stats.friction * dt);
          this.vx -= (this.vx / sp) * drop;
          this.vy -= (this.vy / sp) * drop;
        }
      }
      const maxSp = this.stats.speed * speedMult;
      const sp = Math.hypot(this.vx, this.vy);
      if (sp > maxSp) { this.vx = (this.vx / sp) * maxSp; this.vy = (this.vy / sp) * maxSp; }
      let dx = this.vx * dt, dy = this.vy * dt;
      const kb = this.integrateKnockback(dt);
      dx += kb.x; dy += kb.y;
      const moved = moveWithTiles(this, dx, dy, map);
      this.wallSlide = moved;
      if (moved.x) this.vx *= -0.1;
      if (moved.y) this.vy *= -0.1;
    }

    // espelhamento: olha para a mira sempre
    const aimX = Math.cos(this.aimAngle);
    this.facing = aimX < -0.05 ? -1 : aimX > 0.05 ? 1 : this.facing;

    // ---------------------------------------------------------- acoes
    if (input.pressed('dash') || (input.pressed('fire') && input.down('dash'))) {
      const d = axis.len > 0.1 ? axis : { x: Math.cos(this.aimAngle), y: Math.sin(this.aimAngle) };
      this.tryDash(d.x, d.y);
      if (this.dashing) game.audio.sfx('dash');
    }
    if (input.down('fire') && this.fireCooldown <= 0) playerFire(this, game);
    if (input.pressed('secondary') && this.secondaryCooldown <= 0) playerUseSecondary(this, game);
    if (input.pressed('interact')) {
      if (!this.tryExecute(game)) this.interact(game);
    }
    if (input.pressed('undo') && this.stats.undoDamage && this.stats.undoAvailable) {
      // Duda: desfaz dano manualmente com Z
      this.stats.undoAvailable = false;
      this.stats.undoCooldown = 60;
      this.hp = Math.min(this.maxHp, this.hp + 1);
      game.fx.banner('CTRL+Z! +1 coracao desfeito.', '#7fe3d4', 1.4, 40);
      game.audio.sfx('secret');
    }
    if (input.pressed('slot1') || input.pressed('slot2')) {
      const idx = input.pressed('slot1') ? 0 : 1;
      const slot = this.items && this.items[idx];
      if (slot) this.activeItem = slot;
    }

    // rastro de marca-texto (bencao)
    if (this.stats.trailDamage) {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0 && Math.hypot(this.vx, this.vy) > 20) {
        this.trailTimer = 0.09;
        game.addInkTrail(this.x, this.y);
      }
    }

    // ---------------------------------------------------------- animacao
    const moving = Math.hypot(this.vx, this.vy) > 14 || this.dashing;
    if (this.hurtTimer > 0) this.setAnim('hurt');
    else if (this.dashing) this.setAnim('dash');
    else if (this.pickupAnim > 0) this.setAnim('pickup');
    else if (this.attackAnim > 0) { this.attackAnim -= dt; this.setAnim('attack'); }
    else if (moving) this.setAnim('run');
    else this.setAnim('idle');

    if (this.squash) this.squash = lerp(this.squash, 1, 1 - Math.pow(0.001, dt));
    this.shadowOffset = 0;
  }

  /** Ataque primario publico (tambem usado por bencaos e cutscenes). */
  fire(game) { playerFire(this, game); }

  /** Item ativo publico. */
  useSecondary(game) { playerUseSecondary(this, game); }

  /** Interacao com E: baús, cafeteira, elevador, eventos. */
  interact(game) {
    const target = game.findInteractable(this.x, this.y);
    if (target) {
      game.useInteractable(target);
      return;
    }
    // atacar props destrutiveis a distancia curta (golpe de mao)
    const near = game.nearestProp(this.x, this.y, 22);
    if (near && near.destructible) {
      game.combat.hitProp(near, 2);
      this.attackAnim = 0.18;
      return;
    }
    game.fx.text(this.x, this.y - 14, 'NADA AQUI', '#8f8fa3');
  }

  /** Executa inimigo com postura cheia se estiver perto. */
  tryExecute(game) {
    const target = game.nearestExecutable(this.x, this.y, 26);
    if (target) {
      game.combat.execute(target);
      this.attackAnim = 0.22;
      return true;
    }
    return false;
  }

  draw(ctx, sprites, game) {
    // sombra
    this.drawShadow(ctx, this.w / 2 + 1, 3);
    const key = `${this.spriteKeyPrefix}:${this.anim}`;
    const info = sprites.info(key);
    const frame = info ? sprites.frameAt(key, this.animTime, info.loop !== false && this.anim !== 'idle') : 0;
    // pisca quando invulneravel
    const blink = this.invuln > 0 && !this.dashing && Math.floor(this.invuln * 20) % 2 === 0;
    if (!blink) {
      const squash = this.squash && this.squash !== 1 ? this.squash : 1;
      sprites.draw(ctx, key, frame, this.x, this.y, {
        flip: this.facing < 0,
        flash: this.hitFlash > 0,
        scale: this.dead ? 1 : squash,
      });
    }
    // indicador de execucao disponivel
    if (this.stats.furyTimer > 0) {
      ctx.globalAlpha = 0.5;
      sprites.draw(ctx, key, frame, this.x, this.y, { flash: true, flip: this.facing < 0 });
      ctx.globalAlpha = 1;
    }
  }
}
