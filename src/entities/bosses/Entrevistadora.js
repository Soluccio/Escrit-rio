/**
 * Entrevistadora.js — Andar 3, A ENTREVISTADORA.
 * Fase 1: perguntas que travam o movimento (zonas de efeito no chao).
 * Fase 2: invoca Formularios Vivos que se multiplicam + escudo de papelada.
 * Recompensa: Formulario Assinado (imune a 1 ataque) + bencao rara.
 */
import { Boss } from './Boss.js';
import { Formulario } from '../enemies/Formulario.js';

export class Entrevistadora extends Boss {
  constructor(x, y, scale) {
    super(DEF, x, y, scale);
    this.furyAttack = 'mirrorQuestion';
    this.shielded = false;
  }

  attackPool(game) {
    return this.phase === 1
      ? ['questionZone', 'mirrorQuestion']
      : ['questionZone', 'summonForms', 'paperShield', 'mirrorQuestion'];
  }

  /** Zonas de pergunta no chao: travam e explodem. */
  attack_questionZone(game, _, prepare) {
    if (prepare) {
      const steps = [];
      for (let i = 0; i < 4; i++) {
        steps.push({
          at: i * 0.28,
          fn: () => {
            const p = game.player;
            const a = game.rng.angle();
            const dist = 30 + i * 6;
            const x = p.x + Math.cos(a) * dist;
            const y = p.y + Math.sin(a) * dist;
            game.spawnHazard('question', x, y, {
              radius: 20, damage: this.damage, life: 1.6, from: this, root: 1.4, delay: 0.9,
            });
            game.fx.ring(x, y, 2, 20, this.def.color, 0.3, 1);
          },
        });
      }
      return { telegraph: 0.5, cooldown: 2.2, duration: 1.6, sfx: 'click', script: steps };
    }
  }

  /** Escudo de papelada + invocacao. */
  attack_paperShield(game, _, prepare) {
    if (prepare) {
      return {
        telegraph: 0.4, cooldown: 4.0, duration: 1.2, sfx: 'paper',
        script: [
          {
            at: 0.1, fn: () => {
              this.shielded = true;
              game.fx.banner('ESCUDO DE PAPELADA', this.def.color, 1.4, 44);
              game.fx.ring(this.x, this.y, 10, 46, '#e8e8f0', 0.5, 3);
            },
          },
          { at: 0.4, fn: () => this.summonFormularios(game, 2) },
          { at: 1.1, fn: () => { this.shielded = false; } },
        ],
      };
    }
  }

  attack_summonForms(game, _, prepare) {
    if (prepare) {
      return {
        telegraph: 0.5, cooldown: 3.4, duration: 1.0, sfx: 'paper',
        script: [
          { at: 0.2, fn: () => this.summonFormularios(game, 3) },
          { at: 0.6, fn: () => this.summonFormularios(game, 2) },
        ],
      };
    }
  }

  summonFormularios(game, count) {
    for (let i = 0; i < count; i++) {
      const a = game.rng.angle();
      const x = this.x + Math.cos(a) * 44, y = this.y + Math.sin(a) * 44;
      if (game.room.map.isSolidAt(x, y)) continue;
      const f = new Formulario(x, y, game.scaledEnemyDef('formulario'));
      game.room.entities.push(f);
      game.fx.ring(x, y, 2, 16, '#e8e8f0', 0.3, 1);
    }
    game.audio.sfx('paper');
  }

  /** Espelho: teleporta e dispara perguntas em anel. */
  attack_mirrorQuestion(game, _, prepare) {
    if (prepare) {
      return {
        telegraph: 0.45, cooldown: 2.0, duration: 1.5, sfx: 'dash',
        script: [
          {
            at: 0.0, fn: () => {
              const map = game.room.map;
              for (let tries = 0; tries < 12; tries++) {
                const a = game.rng.angle();
                const x = game.player.x + Math.cos(a) * 90;
                const y = game.player.y + Math.sin(a) * 90;
                if (!map.isSolidAt(x, y) && x > 20 && y > 20 && x < game.room.w - 20 && y < game.room.h - 20) {
                  game.fx.ring(this.x, this.y, 4, 26, this.def.color, 0.3, 2);
                  this.x = x; this.y = y;
                  game.fx.ring(this.x, this.y, 4, 26, this.def.color, 0.3, 2);
                  break;
                }
              }
            },
          },
          {
            at: 0.5, fn: () => {
              const n = 10;
              for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2 + this.time;
                game.spawnProjectile({
                  kind: 'issue', x: this.x, y: this.y, angle: a, speed: 120,
                  damage: this.damage, from: 'enemy',
                });
              }
              game.audio.sfx('print');
            },
          },
          {
            at: 1.0, fn: () => {
              const n = 10;
              for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2 + this.time + 0.3;
                game.spawnProjectile({
                  kind: 'issue', x: this.x, y: this.y, angle: a, speed: 120,
                  damage: this.damage, from: 'enemy',
                });
              }
            },
          },
        ],
      };
    }
  }
}

const DEF = {
  id: 'entrevistadora', name: 'A ENTREVISTADORA', sprite: 'entrevistadora', size: 40,
  floor: 3, hp: 210, speed: 28, dmg: 1, mini: true, color: '#b39ddb', music: 'boss_rh',
  phases: [1, 2], attacks: ['questionZone', 'summonForms', 'paperShield', 'mirrorQuestion'],
  intro: 'Fale sobre um desafio. E sobre outro. E sobre todos eles.',
  reward: { signedForm: true, rareBlessing: 1, coins: 40 },
};
