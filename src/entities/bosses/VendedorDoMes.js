/**
 * VendedorDoMes.js — Andar 2, O VENDEDOR DO MES.
 * Fase 1: planilhas amaldicoadas em arco + telefone que persegue o player.
 * Fase 2: vira "meta batida" — fica gigante e esmaga o chao criando ondas de choque.
 * Recompensa: Cracha de Vendas (+dano) + 20 cafes.
 */
import { Boss } from './Boss.js';

export class VendedorDoMes extends Boss {
  constructor(x, y, scale) {
    super(BOSS_DEF, x, y, scale);
    this.furyAttack = 'giantSlam';
    this.giant = false;
  }

  attackPool(game) {
    return this.phase === 1 ? ['curseSheet', 'huntingPhone'] : ['curseSheet', 'huntingPhone', 'giantSlam', 'shockwave'];
  }

  /** Planilhas amaldicoadas em arco. */
  attack_curseSheet(game, _, prepare) {
    if (prepare) {
      return {
        telegraph: 0.5, cooldown: 1.6, duration: 1.3, sfx: 'print',
        script: [
          { at: 0.0, fn: () => this.arcSheets(game, 4, -0.3) },
          { at: 0.6, fn: () => this.arcSheets(game, 4, 0.3) },
        ],
      };
    }
  }

  arcSheets(game, count, spread) {
    for (let i = 0; i < count; i++) {
      const a = this.attackAngle + (i - (count - 1) / 2) * (0.42 + spread * 0.2);
      game.spawnProjectile({
        kind: 'number', x: this.x, y: this.y - 6, angle: a, speed: 160,
        damage: this.damage, from: 'enemy', gravity: 110, number: game.rng.int(1, 4),
      });
    }
    game.audio.sfx('print');
  }

  /** Telefone perseguidor (homing). */
  attack_huntingPhone(game, _, prepare) {
    if (prepare) {
      return {
        telegraph: 0.55, cooldown: 2.8, duration: 0.9, sfx: 'ring',
        script: [{
          at: 0.1, fn: () => {
            for (let i = 0; i < 2; i++) {
              const a = this.attackAngle + (i === 0 ? -0.5 : 0.5);
              game.spawnProjectile({
                kind: 'soundwave', x: this.x, y: this.y, angle: a, speed: 90, damage: this.damage,
                from: 'enemy', homing: 2.2, life: 3.5, sound: true, scale: 1.6,
              });
            }
            game.audio.sfx('ring');
            game.fx.banner('LIGACAO A COBRAR', this.def.color, 1.2, 44);
          },
        }],
      };
    }
  }

  /** Fica gigante e esmaga o chao. */
  attack_giantSlam(game, _, prepare) {
    if (prepare) {
      return {
        telegraph: 0.7, cooldown: 3.0, duration: 1.6, sfx: 'bossHorn',
        script: [
          {
            at: 0.0, fn: () => {
              this.giant = true; this.scale = 1.5;
              game.fx.banner('META BATIDA!', this.def.color, 1.4, 44);
              game.camera.addShake(4);
            },
          },
          {
            at: 0.5, fn: () => {
              game.camera.addShake(9);
              game.audio.sfx('stamp');
              game.fx.ring(this.x, this.y, 8, 120, this.def.color, 0.5, 4);
              const player = game.player;
              const d = Math.hypot(player.x - this.x, player.y - this.y);
              if (d < 90) game.combat.hitPlayer(this, this.damage + 1, {});
              for (let i = 0; i < 10; i++) {
                const a = (i / 10) * Math.PI * 2;
                game.spawnHazard('shock', this.x + Math.cos(a) * 30, this.y + Math.sin(a) * 30, {
                  radius: 18, damage: this.damage, life: 0.5, from: this, propagate: { x: Math.cos(a), y: Math.sin(a), speed: 90 },
                });
              }
            },
          },
          { at: 1.2, fn: () => { this.giant = false; this.scale = 1; } },
        ],
      };
    }
  }

  /** Ondas de choque em aneis. */
  attack_shockwave(game, _, prepare) {
    if (prepare) {
      const steps = [];
      for (let i = 0; i < 4; i++) {
        steps.push({
          at: i * 0.35,
          fn: () => {
            game.fx.ring(this.x, this.y, 10, 70 + i * 20, this.def.color, 0.4, 3);
            game.spawnHazard('shock', this.x, this.y, {
              radius: 44 + i * 8, damage: this.damage, life: 0.4, from: this, ring: true,
            });
            game.camera.addShake(3);
          },
        });
      }
      return { telegraph: 0.6, cooldown: 2.4, duration: 1.8, sfx: 'stamp', script: steps };
    }
  }
}

const BOSS_DEF = {
  id: 'vendedor', name: 'O VENDEDOR DO MES', sprite: 'vendedor', size: 42,
  floor: 2, hp: 165, speed: 30, dmg: 1, mini: true, color: '#ff9800', music: 'boss_vendas',
  phases: [1, 2], attacks: ['curseSheet', 'huntingPhone', 'giantSlam', 'shockwave'],
  intro: 'BATEU A META! E agora vou bater VOCE. Sinergia total!',
  reward: { badge: true, coffees: 20, coins: 40 },
};
