/**
 * Combat.js — resolucao de dano: acertos, critico, postura, execucao,
 * knockback, flash, hitstop, particulas e combo counter.
 * Todo dano do jogo passa por aqui (player -> inimigo e inimigo -> player).
 */
import { TUNING, PLAYER, ENEMY } from '../data/constants.js';
import { PAL } from '../sprites/Palette.js';
import { PARTICLE_PRESETS } from './FX.js';

export class Combat {
  constructor(game) {
    this.game = game;
    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.totalDamage = 0;
    this.roomKills = 0;
  }

  resetRoom() { this.roomKills = 0; }
  resetRun() { this.combo = 0; this.comboTimer = 0; this.totalDamage = 0; this.roomKills = 0; }

  update(dt) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
  }

  /**
   * Aplica dano a um inimigo vindo do player.
   * @returns {{damage:number, killed:boolean, crit:boolean, executed:boolean}}
   */
  hitEnemy(enemy, baseDamage, opts = {}) {
    if (!enemy || enemy.dead || enemy.invuln > 0) return { damage: 0, killed: false };
    const stats = this.game.player.stats;

    let dmg = baseDamage * stats.damage;
    if (enemy.elite) dmg *= stats.eliteDamage;
    if (stats.furyTimer > 0) dmg *= 1.5;

    // critico
    let crit = false;
    if (this.game.rng.chance(stats.critChance) && !opts.noCrit) {
      dmg *= stats.critMult;
      crit = true;
    }
    dmg = Math.max(1, Math.round(dmg));

    enemy.hp -= dmg;
    this.totalDamage += dmg;

    // feedback visual imediato
    const dir = opts.angle ?? Math.atan2(enemy.y - (opts.fromY ?? enemy.y), enemy.x - (opts.fromX ?? enemy.x));
    enemy.hurtFlash();
    if (!opts.noKnock) {
      const force = (opts.knockback ?? ENEMY.knockback) * (enemy.big ? 0.25 : 1);
      enemy.applyKnockback(dir, force);
    }
    enemy.stun = Math.max(enemy.stun, opts.stun || 0);
    enemy.onHit?.(dmg, opts);

    // postura (barra de execucao)
    let postureFilled = false;
    if (enemy.postureMax && !enemy.executable) {
      enemy.posture = (enemy.posture || 0) + (opts.posture ?? PLAYER.posturePerHit);
      if (enemy.posture >= enemy.postureMax) {
        enemy.posture = enemy.postureMax;
        enemy.executable = true;
        enemy.execTimer = TUNING.executeWindow;
        postureFilled = true;
      }
    }

    // juice
    this.game.fx.damageNumber(enemy.x, enemy.y, dmg, crit ? 'crit' : 'normal');
    this.game.fx.hitSpark(enemy.x, enemy.y, dir, crit ? '#ffd93d' : '#ffffff');
    this.game.fx.hitStop(TUNING.hitstopHit);
    this.game.camera.addShake(crit ? 2.4 : TUNING.shakeHit);
    this.game.audio.sfx(crit ? 'staple' : 'clip', { pitch: crit ? 1.3 : 1 });

    const killed = enemy.hp <= 0;
    if (killed) {
      this.killEnemy(enemy, opts);
    } else if (postureFilled) {
      this.game.fx.banner('EXECUTAR! [E]', '#ff5252', 2.0, 28);
      this.game.audio.sfx('stamp');
    }
    return { damage: dmg, killed, crit, executed: false };
  }

  /** Execucao: dano massivo enquanto a barra de postura esta cheia. */
  execute(enemy) {
    if (!enemy.executable || enemy.dead) return false;
    const dmg = Math.max(6, Math.round(enemy.maxHp * 0.6));
    this.game.fx.burst(enemy.x, enemy.y, 'clip', { count: 12, speedMult: 1.4 });
    this.game.fx.damageNumber(enemy.x, enemy.y, dmg, 'exec');
    this.game.fx.freezeFrame(0.08);
    this.game.camera.addShake(4);
    this.game.audio.sfx('execute');
    enemy.hp -= dmg;
    if (enemy.hp <= 0) this.killEnemy(enemy, { executed: true });
    else {
      enemy.executable = false;
      enemy.posture = enemy.postureMax * 0.3;
      enemy.stun = 0.8;
    }
    return true;
  }

  /** Morte de inimigo: particulas, moedas, combo, freeze frame. */
  killEnemy(enemy, opts = {}) {
    if (enemy.dead) return;
    enemy.dead = true;
    enemy.onDeath?.();
    this.roomKills++;
    this.game.stats.kills++;

    const preset = enemy.particlePreset || 'paper';
    this.game.fx.burst(enemy.x, enemy.y, preset, { count: opts.executed ? 14 : undefined });
    this.game.fx.death(enemy.spriteKeyIdle || enemy.spriteKeyBase || 'enemy:papel:idle',
      enemy.spriteFrame || 0, enemy.x, enemy.y, { scale: enemy.scale });
    this.game.fx.hitStop(TUNING.hitstopKill);
    this.game.camera.addShake(TUNING.shakeKill);
    this.game.audio.sfx(enemy.sfx || 'paper', { pitch: 1 + this.game.rng.range(-0.1, 0.2) });

    // combo
    this.combo++;
    this.comboTimer = TUNING.comboTimer;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    if (this.combo >= TUNING.comboMin) {
      this.game.fx.banner(`x${this.combo} COMBO!`, '#ffcf4d', 0.9, 46);
    }

    // drops
    const coinBonus = this.combo >= TUNING.comboMin ? TUNING.comboCoinBonus : 0;
    this.game.dropLoot(enemy, coinBonus);

    // bencaos de abate (Kiko / cafeteira)
    const stats = this.game.player.stats;
    if (stats.healOnKillEvery && this.game.stats.kills % stats.healOnKillEvery === 0) {
      this.game.player.heal(0.5);
      this.game.audio.sfx('heal');
    }
    if (stats.coffeeEveryKill && this.game.stats.kills % stats.coffeeEveryKill === 0) {
      this.game.spawnPickup('coffee', enemy.x, enemy.y);
    }
  }

  /** Dano no player (inimigos, projeteis, hazards). */
  hitPlayer(source, amount, opts = {}) {
    const player = this.game.player;
    if (player.dead || player.invuln > 0 || player.dashing) return false;
    if (opts.sound && player.stats.soundImmune) {
      this.game.fx.text(player.x, player.y - 12, 'BLOQUEADO', '#7fe3d4');
      this.game.audio.sfx('click');
      return false;
    }
    // Duda: Ctrl+Z desfaz 1 dano a cada 60s
    if (player.stats.undoAvailable && player.stats.undoDamage) {
      player.stats.undoAvailable = false;
      player.stats.undoCooldown = 60;
      this.game.fx.banner('CTRL+Z! Dano desfeito.', '#7fe3d4', 1.6, 40);
      this.game.audio.sfx('secret');
      return false;
    }
    player.hp -= amount;
    this.game.stats.damageTaken += amount;
    player.invuln = player.stats.hurtInvuln;
    player.hurtTimer = 0.4;
    player.setAnim('hurt');
    const ang = source ? Math.atan2(player.y - source.y, player.x - source.x) : 0;
    player.applyKnockback(ang, 120);
    this.game.fx.burst(player.x, player.y, 'blood', { dir: ang, count: 8, spread: 1.2 });
    this.game.fx.hitStop(0.08);
    this.game.camera.addShake(TUNING.shakeHurt);
    this.game.audio.sfx('hurt');
    this.game.shakeFlash = 0.35;
    this.combo = 0; this.comboTimer = 0;
    if (player.hp <= 0) this.game.onPlayerDeath();
    return true;
  }

  /** Dano de props destrutiveis (mesas, impressoras, servidores). */
  hitProp(prop, amount) {
    if (!prop || !prop.destructible || prop.broken) return false;
    const broke = prop.damage(amount);
    this.game.fx.burst(prop.x, prop.y, 'dust', { count: 4 });
    if (broke) {
      const preset = prop.kind === 'server' ? 'digital' : prop.kind === 'plant' ? 'paper' : 'dust';
      this.game.fx.burst(prop.x, prop.y, preset, { count: 12, speedMult: 1.2 });
      this.game.audio.sfx(prop.kind === 'printer' ? 'print' : 'stamp');
      this.game.camera.addShake(1.6);
      if (prop.drops && prop.drops !== 'none') {
        this.game.spawnPickup(prop.drops, prop.x, prop.y);
      }
    }
    return broke;
  }
}
