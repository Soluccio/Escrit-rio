/**
 * Recepcionista.js — Andar 1, A RECEPCIONISTA.
 * Fase 1: arremessa canetas e agendas em leque.
 * Fase 2: invoca Visitantes Perdidos e gira a cadeira criando redemoinho de papeis.
 * Recompensa: Chave do Elevador + 1 bencao aleatoria.
 */
import { Boss } from './Boss.js';

export class Recepcionista extends Boss {
  constructor(x, y, scale) {
    super(BOSSES_RECEP, x, y, scale);
    this.furyAttack = 'chairSpin';
    this.spinAngle = 0;
  }

  attackPool(game) {
    return this.phase === 1 ? ['penFan', 'agendaThrow'] : ['penFan', 'agendaThrow', 'summonVisitors', 'chairSpin'];
  }

  /** Leque de canetas (3 rajadas curtas). */
  attack_penFan(game, _, prepare) {
    if (prepare) {
      return {
        telegraph: 0.45, cooldown: 1.5, duration: 1.1, sfx: 'click',
        script: [
          { at: 0.0, fn: () => this.fanVolley(game, 0) },
          { at: 0.35, fn: () => this.fanVolley(game, 0.14) },
          { at: 0.7, fn: () => this.fanVolley(game, -0.14) },
        ],
      };
    }
  }

  fanVolley(game, offset) {
    const base = this.attackAngle + offset;
    for (let i = -3; i <= 3; i++) {
      const a = base + i * 0.16;
      game.spawnProjectile({
        kind: 'pen', x: this.x, y: this.y, angle: a, speed: 150, damage: this.damage,
        from: 'enemy', color: i % 2 ? '#e53935' : '#1e88e5',
      });
    }
    game.audio.sfx('clip');
    game.fx.slash(this.x, this.y, base, 20, this.def.color);
  }

  /** Agendas que quicam. */
  attack_agendaThrow(game, _, prepare) {
    if (prepare) {
      return {
        telegraph: 0.5, cooldown: 1.8, duration: 1.2, sfx: 'print',
        script: [
          { at: 0.05, fn: () => this.throwMany(game, 'issue', 3, 150, -0.18) },
          { at: 0.55, fn: () => this.throwMany(game, 'issue', 2, 190, 0.24) },
        ],
      };
    }
  }

  throwMany(game, kind, count, speed, spread) {
    for (let i = 0; i < count; i++) {
      const a = this.attackAngle + (i - (count - 1) / 2) * spread;
      game.spawnProjectile({
        kind, x: this.x, y: this.y, angle: a, speed, damage: this.damage,
        from: 'enemy', gravity: 60, wallBounce: true,
      });
    }
    game.audio.sfx('print');
  }

  /** Invoca 2 Visitantes Perdidos (inimigos comuns). */
  attack_summonVisitors(game, _, prepare) {
    if (prepare) {
      return {
        telegraph: 0.6, cooldown: 3.2, duration: 1.4, sfx: 'ring',
        script: [{
          at: 0.3, fn: () => {
            for (let i = 0; i < 2; i++) {
              const a = game.rng.angle();
              const x = this.x + Math.cos(a) * 40, y = this.y + Math.sin(a) * 40;
              const e = game.spawnEnemy('papel', x, y, { scale: game.floorScale });
              if (e) e.name = 'Visitante Perdido';
              game.fx.ring(x, y, 4, 22, this.def.color, 0.4, 2);
            }
            game.fx.banner('OS VISITANTES CHEGARAM', this.def.color, 1.4, 44);
            game.audio.sfx('ring');
          },
        }],
      };
    }
  }

  /** Redemoinho de papeis: gira a cadeira e solta papeis em espiral. */
  attack_chairSpin(game, _, prepare) {
    if (prepare) {
      const steps = [];
      for (let i = 0; i < 14; i++) {
        steps.push({
          at: i * 0.12,
          fn: () => {
            this.spinAngle += 0.9;
            for (let k = 0; k < 3; k++) {
              const a = this.spinAngle + (k * Math.PI * 2) / 3;
              game.spawnProjectile({
                kind: 'paperball', x: this.x, y: this.y, angle: a, speed: 120 + i * 5,
                damage: this.damage, from: 'enemy', wallBounce: false,
              });
            }
            game.fx.ring(this.x, this.y, 10, 30, this.def.color, 0.25, 1);
          },
        });
      }
      return { telegraph: 0.55, cooldown: 2.6, duration: 1.9, sfx: 'dash', script: steps };
    }
  }
}

const BOSSES_RECEP = {
  id: 'recepcionista', name: 'A RECEPCIONISTA', sprite: 'recepcionista', size: 40,
  floor: 1, hp: 120, speed: 26, dmg: 1, mini: true, color: '#ff8fa3', music: 'boss_recep',
  phases: [1, 2], attacks: ['penFan', 'agendaThrow', 'summonVisitors', 'chairSpin'],
  intro: 'Bem-vindo(a)! Voce tem hora marcada? Nao? Entao tome caneta na cara.',
  reward: { key: true, blessings: 1, coins: 25 },
};
