/**
 * CEO.js — Andar 6, O CEO (boss final, 3 fases).
 * Fase 1: ataques corporativos variados (projeteis em padroes, investidas).
 * Fase 2: invoca clones de si mesmo + executivos com escudo.
 * Fase 3: revela ser VOCE de uma run passada — luta espelhada, ele usa as
 *         mesmas bencaos que voce pegou.
 * Morte: slow motion, kanji 終, escolha final (aceitar a proposta ou quebrar o ciclo).
 */
import { Boss } from './Boss.js';

export class CEO extends Boss {
  constructor(x, y, scale) {
    super(DEF, x, y, scale);
    this.furyAttack = 'finalAudit';
    this.cloneRefs = [];
    this.charging = false;
  }

  attackPool(game) {
    if (this.phase === 1) return ['corporateSpread', 'charge'];
    if (this.phase === 2) return ['corporateSpread', 'charge', 'cloneExecs', 'executiveShield'];
    return ['corporateSpread', 'mirrorBlessings', 'finalAudit', 'charge'];
  }

  /** Projeteis corporativos em espiral/leque. */
  attack_corporateSpread(game, _, prepare) {
    if (prepare) {
      const steps = [];
      const waves = this.phase >= 3 ? 7 : 5;
      for (let i = 0; i < waves; i++) {
        steps.push({
          at: i * 0.22,
          fn: () => {
            const n = 8 + this.phase * 2;
            const off = i * 0.35 + this.time;
            for (let k = 0; k < n; k++) {
              const a = off + (k / n) * Math.PI * 2;
              game.spawnProjectile({
                kind: 'number', x: this.x, y: this.y, angle: a, speed: 130 + i * 8,
                damage: this.damage, from: 'enemy', number: game.rng.int(1, 4),
              });
            }
            game.audio.sfx('clip', { pitch: 0.7, volume: 0.25 });
          },
        });
      }
      return { telegraph: 0.5, cooldown: 1.9, duration: waves * 0.22 + 0.3, sfx: 'click', script: steps };
    }
  }

  /** Investida corporativa. */
  attack_charge(game, _, prepare) {
    if (prepare) {
      const p = game.player;
      const a = Math.atan2(p.y - this.y, p.x - this.x);
      return {
        telegraph: 0.65, cooldown: 2.4, duration: 1.2, sfx: 'ceoRoar',
        script: [
          {
            at: 0.0, fn: () => {
              this.charging = true;
              this.vx = Math.cos(a) * 300; this.vy = Math.sin(a) * 300;
              game.camera.addShake(3);
              game.fx.ring(this.x, this.y, 6, 30, '#ffcf4d', 0.3, 3);
            },
          },
          {
            at: 0.5, fn: () => {
              const d = Math.hypot(game.player.x - this.x, game.player.y - this.y);
              if (d < 40) game.combat.hitPlayer(this, this.damage + 1, {});
              this.charging = false;
            },
          },
          { at: 1.0, fn: () => { this.charging = false; } },
        ],
      };
    }
  }

  /** Clones + executivos com escudo de pasta. */
  attack_cloneExecs(game, _, prepare) {
    if (prepare) {
      return {
        telegraph: 0.6, cooldown: 4.2, duration: 1.3, sfx: 'bossHorn',
        script: [
          {
            at: 0.2, fn: () => {
              game.fx.banner('O CONSELHO CHEGOU', '#ffcf4d', 1.8, 44);
              for (let i = 0; i < 2; i++) {
                const a = game.rng.angle();
                const x = this.x + Math.cos(a) * 50, y = this.y + Math.sin(a) * 50;
                game.spawnEnemy('burocrata', x, y, { scale: game.floorScale });
              }
              // clones do CEO (visual: projeteis em leque logo abaixo)
              for (let i = 0; i < 3; i++) {
                const a = game.rng.angle();
                const x = this.x + Math.cos(a) * 60, y = this.y + Math.sin(a) * 60;
                game.spawnEnemy('fantasma', x, y, { scale: game.floorScale });
              }
            },
          },
          {
            at: 0.7, fn: () => {
              const n = 12;
              for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2 + this.time;
                game.spawnProjectile({
                  kind: 'issue', x: this.x, y: this.y, angle: a, speed: 150,
                  damage: this.damage, from: 'enemy',
                });
              }
            },
          },
        ],
      };
    }
  }

  /** Escudo executivo: invulneravel por 3s enquanto atira. */
  attack_executiveShield(game, _, prepare) {
    if (prepare) {
      return {
        telegraph: 0.4, cooldown: 5.0, duration: 3.0, sfx: 'stamp',
        script: [
          {
            at: 0.0, fn: () => {
              this.invuln = 3.0;
              game.fx.banner('PROTECAO DO CONSELHO', '#ffcf4d', 1.6, 44);
              game.fx.ring(this.x, this.y, 10, 50, '#ffcf4d', 0.5, 3);
            },
          },
          ...Array.from({ length: 6 }, (_, i) => ({
            at: 0.4 + i * 0.4,
            fn: () => {
              const p = game.player;
              const a = Math.atan2(p.y - this.y, p.x - this.x) + game.rng.range(-0.2, 0.2);
              game.spawnProjectile({
                kind: 'number', x: this.x, y: this.y, angle: a, speed: 200,
                damage: this.damage, from: 'enemy', number: game.rng.int(1, 4),
              });
            },
          })),
        ],
      };
    }
  }

  /** Ele usa AS SUAS bencaos: dispara um projétil por bencao que voce tem. */
  attack_mirrorBlessings(game, _, prepare) {
    if (prepare) {
      const count = Math.min(14, 3 + game.player.stats.blessings.length);
      return {
        telegraph: 0.55, cooldown: 2.6, duration: 1.6, sfx: 'secret',
        script: [
          {
            at: 0.0, fn: () => {
              game.fx.banner('EU TENHO AS SUAS BENCAOS', '#ffcf4d', 2.0, 44);
              const p = game.player;
              const base = Math.atan2(p.y - this.y, p.x - this.x);
              for (let i = 0; i < count; i++) {
                const a = base + (i - (count - 1) / 2) * 0.24;
                game.spawnProjectile({
                  kind: 'paperball', x: this.x, y: this.y, angle: a, speed: 160 + i * 6,
                  damage: this.damage, from: 'enemy', scale: 1.4,
                });
              }
              game.audio.sfx('blessing');
            },
          },
          {
            at: 0.8, fn: () => {
              const p = game.player;
              const a = Math.atan2(p.y - this.y, p.x - this.x);
              game.spawnProjectile({
                kind: 'slide', x: this.x, y: this.y, angle: a, speed: 260,
                damage: this.damage + 1, from: 'enemy', pierce: 4, scale: 1.6,
              });
            },
          },
        ],
      };
    }
  }

  /** Auditoria final: tudo ao mesmo tempo (usado na furia). */
  attack_finalAudit(game, _, prepare) {
    if (prepare) {
      const steps = [];
      for (let i = 0; i < 10; i++) {
        steps.push({
          at: i * 0.2,
          fn: () => {
            const n = 10 + (i % 3) * 4;
            const off = this.time * 1.4 + i * 0.4;
            for (let k = 0; k < n; k++) {
              const a = off + (k / n) * Math.PI * 2;
              game.spawnProjectile({
                kind: k % 2 ? 'number' : 'paperball', x: this.x, y: this.y, angle: a,
                speed: 110 + (i % 4) * 25, damage: this.damage, from: 'enemy',
              });
            }
            if (i % 3 === 2) {
              const p = game.player;
              const a = Math.atan2(p.y - this.y, p.x - this.x);
              game.spawnProjectile({
                kind: 'slide', x: this.x, y: this.y, angle: a, speed: 300,
                damage: this.damage + 1, from: 'enemy', pierce: 9, scale: 1.8,
              });
            }
            game.fx.ring(this.x, this.y, 8, 40, '#ffcf4d', 0.25, 1);
          },
        });
      }
      return { telegraph: 0.6, cooldown: 3.4, duration: 2.4, sfx: 'ceoRoar', script: steps };
    }
  }

  draw(ctx, sprites, game) {
    if (this.charging) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ffcf4d';
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 12, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    super.draw(ctx, sprites, game);
  }
}

const DEF = {
  id: 'ceo', name: 'O CEO', sprite: 'ceo', size: 64,
  floor: 6, hp: 620, speed: 30, dmg: 2, mini: false, color: '#ffcf4d', music: 'boss_ceo',
  phases: [1, 2, 3],
  attacks: ['corporateSpread', 'charge', 'cloneExecs', 'executiveShield', 'mirrorBlessings', 'finalAudit'],
  intro: 'Max. Eu fui voce. Voce sera eu. Assine aqui, na linha pontilhada da sua alma.',
  reward: { win: true },
};
