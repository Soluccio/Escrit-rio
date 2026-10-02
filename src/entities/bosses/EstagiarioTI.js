/**
 * EstagiarioTI.js — Andar 5, O ESTAGIARIO DE TI (3 fases!).
 * Fase 1: cabos e enxame de Bugs.
 * Fase 2: "reinicia a sala" — inverte os controles por 3s e vira um virus gigante.
 * Fase 3: revela ser outro Max de uma run anterior (luta ESPELHADA: usa os
 *         mesmos ataques do player).
 * Recompensa: Pen Drive Dourado + habilidade extra.
 */
import { Boss } from './Boss.js';

export class EstagiarioTI extends Boss {
  constructor(x, y, scale) {
    super(DEF, x, y, scale);
    this.furyAttack = 'mirrorMax';
    this.virus = false;
    this.rebootFlash = 0;
  }

  attackPool(game) {
    if (this.phase === 1) return ['cableWhip', 'bugSwarm'];
    if (this.phase === 2) return ['bugSwarm', 'roomReboot', 'virusGiant'];
    return ['mirrorMax', 'roomReboot', 'cableWhip'];
  }

  /** Chicote de cabos em leque curto. */
  attack_cableWhip(game, _, prepare) {
    if (prepare) {
      return {
        telegraph: 0.4, cooldown: 1.3, duration: 0.9, sfx: 'cable',
        script: [
          { at: 0.0, fn: () => this.whip(game, -0.6) },
          { at: 0.3, fn: () => this.whip(game, 0) },
          { at: 0.6, fn: () => this.whip(game, 0.6) },
        ],
      };
    }
  }

  whip(game, offset) {
    const a = this.attackAngle + offset;
    const x = this.x + Math.cos(a) * 30, y = this.y + Math.sin(a) * 30;
    game.spawnHazard('shock', x, y, { radius: 22, damage: this.damage, life: 0.25, from: this, visual: 'spark' });
    game.fx.slash(x, y, a, 22, '#00e676');
    game.audio.sfx('cable');
  }

  /** Enxame de bugs. */
  attack_bugSwarm(game, _, prepare) {
    if (prepare) {
      return {
        telegraph: 0.5, cooldown: 3.0, duration: 1.1, sfx: 'bug',
        script: [{
          at: 0.2, fn: () => {
            const n = 4 + (this.phase >= 2 ? 2 : 0);
            for (let i = 0; i < n; i++) {
              const a = game.rng.angle();
              const x = this.x + Math.cos(a) * 40, y = this.y + Math.sin(a) * 40;
              game.spawnEnemy('bug', x, y, { scale: game.floorScale });
            }
            game.fx.banner('ENXAME!', '#00e676', 1.2, 44);
            game.audio.sfx('bug');
          },
        }],
      };
    }
  }

  /** Reinicia a sala: pisca tudo e inverte os controles por 3s. */
  attack_roomReboot(game, _, prepare) {
    if (prepare) {
      return {
        telegraph: 0.7, cooldown: 5.0, duration: 1.4, sfx: 'ceoRoar',
        script: [
          {
            at: 0.0, fn: () => {
              game.rebootFlash = 0.4;
              game.fx.banner('REINICIANDO...', '#00e676', 1.8, 44);
              game.audio.sfx('elevator');
            },
          },
          {
            at: 0.5, fn: () => {
              game.invertControls(3.0);
              game.fx.banner('CONTROLES INVERTIDOS (3s)', '#ff5252', 2.2, 60);
              game.camera.addShake(6);
            },
          },
        ],
      };
    }
  }

  /** Vira um virus gigante e caca o player. */
  attack_virusGiant(game, _, prepare) {
    if (prepare) {
      return {
        telegraph: 0.6, cooldown: 4.0, duration: 2.4, sfx: 'bossHorn',
        script: [
          {
            at: 0.0, fn: () => {
              this.virus = true; this.scale = 1.5; this.speed = 46;
              game.fx.banner('VIRUS GIGANTE', '#00e676', 1.6, 44);
              game.camera.addShake(5);
            },
          },
          {
            at: 0.4, fn: () => {
              game.spawnHazard('digital', this.x, this.y, { radius: 40, damage: this.damage, life: 2.0, from: this });
            },
          },
          { at: 1.6, fn: () => { this.virus = false; this.scale = 1; this.speed = this.def.speed; } },
        ],
      };
    }
  }

  /** MAX ESPELHADO: usa clipes, dash e o item ativo copiado do player. */
  attack_mirrorMax(game, _, prepare) {
    if (prepare) {
      const steps = [];
      // rajada de clipes em leque triplo (igual ao player)
      for (let i = 0; i < 6; i++) {
        steps.push({
          at: i * 0.16,
          fn: () => {
            const p = game.player;
            const a = Math.atan2(p.y - this.y, p.x - this.x);
            for (let k = -1; k <= 1; k++) {
              game.spawnProjectile({
                kind: 'staple', x: this.x, y: this.y, angle: a + k * 0.16,
                speed: 240, damage: 1, from: 'enemy', scale: 1.2,
              });
            }
            game.audio.sfx('clip', { volume: 0.2 });
          },
        });
      }
      // dash investida
      steps.push({
        at: 1.1, fn: () => {
          const p = game.player;
          const a = Math.atan2(p.y - this.y, p.x - this.x);
          this.vx = Math.cos(a) * 340; this.vy = Math.sin(a) * 340;
          game.fx.banner('EU SOU VOCE', '#7fe3d4', 1.6, 44);
          game.audio.sfx('dash');
          game.fx.ghost(`boss:estagiarioTI:idle`, 0, this.x, this.y);
        },
      });
      steps.push({ at: 1.5, fn: () => this.fanVolley(game) });
      return { telegraph: 0.5, cooldown: 2.2, duration: 1.9, sfx: 'click', script: steps };
    }
  }

  fanVolley(game) {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      game.spawnProjectile({
        kind: 'clip', x: this.x, y: this.y, angle: a, speed: 200, damage: 1, from: 'enemy',
      });
    }
  }
}

const DEF = {
  id: 'estagiarioTI', name: 'O ESTAGIARIO DE TI', sprite: 'estagiarioTI', size: 40,
  floor: 5, hp: 330, speed: 34, dmg: 2, mini: true, color: '#00e676', music: 'boss_ti',
  phases: [1, 2, 3], attacks: ['cableWhip', 'bugSwarm', 'roomReboot', 'virusGiant', 'mirrorMax'],
  intro: 'Ja tentou desligar e ligar de novo? Pois e. Nao funciona com a gente.',
  reward: { legendary: 'pendrive', ability: true, coins: 70 },
};
