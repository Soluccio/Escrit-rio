/**
 * GerenteProjetos.js — Andar 4, O GERENTE DE PROJETOS.
 * Fase 1: projeta slides que causam dano em linha + cadeiras giratorias.
 * Fase 2: apresentacao infinita — o player precisa DESTRUIR O PROJETOR
 *         enquanto desvia dos cafes derramados.
 * Recompensa: Controle do Projetor (item ativo) + item raro.
 */
import { Boss } from './Boss.js';
import { Prop } from '../../world/Prop.js';

export class GerenteProjetos extends Boss {
  constructor(x, y, scale) {
    super(DEF, x, y, scale);
    this.furyAttack = 'projectorCore';
    this.projector = null;
    this.chairs = [];
  }

  attackPool(game) {
    return this.phase === 1 ? ['slideBeam', 'spinChair'] : ['slideBeam', 'spinChair', 'drips', 'projectorCore'];
  }

  /** Slides em linha (feixes) em cruz e diagonais. */
  attack_slideBeam(game, _, prepare) {
    if (prepare) {
      return {
        telegraph: 0.55, cooldown: 1.9, duration: 1.4, sfx: 'print',
        script: [
          { at: 0.0, fn: () => this.beamVolley(game, 0) },
          { at: 0.5, fn: () => this.beamVolley(game, Math.PI / 4) },
          { at: 1.0, fn: () => this.beamVolley(game, 0) },
        ],
      };
    }
  }

  beamVolley(game, offset) {
    const player = game.player;
    const base = Math.atan2(player.y - this.y, player.x - this.x) + offset;
    for (let i = -1; i <= 1; i++) {
      const a = base + i * 0.22;
      game.spawnProjectile({
        kind: 'slide', x: this.x, y: this.y, angle: a, speed: 210, damage: this.damage + 1,
        from: 'enemy', pierce: 3, scale: 1.4,
      });
    }
    game.fx.slash(this.x, this.y, base, 26, '#ffd54f');
    game.audio.sfx('print');
  }

  /** Cadeiras giratorias que orbitam e voam. */
  attack_spinChair(game, _, prepare) {
    if (prepare) {
      const steps = [];
      for (let i = 0; i < 8; i++) {
        steps.push({
          at: i * 0.16,
          fn: () => {
            const a = (i / 8) * Math.PI * 2 + this.time;
            game.spawnProjectile({
              kind: 'cable', x: this.x + Math.cos(a) * 26, y: this.y + Math.sin(a) * 26,
              angle: a, speed: 140, damage: this.damage, from: 'enemy', scale: 1.4,
            });
          },
        });
      }
      return { telegraph: 0.5, cooldown: 2.4, duration: 1.6, sfx: 'staple', script: steps };
    }
  }

  /** Pingos de cafe do teto (zonas telegrafadas). */
  attack_drips(game, _, prepare) {
    if (prepare) {
      const steps = [];
      for (let i = 0; i < 8; i++) {
        steps.push({
          at: i * 0.18,
          fn: () => {
            const a = game.rng.angle();
            const r = game.rng.range(30, 90);
            const x = game.player.x + Math.cos(a) * r;
            const y = game.player.y + Math.sin(a) * r;
            if (game.room.map.isSolidAt(x, y)) return;
            game.spawnHazard('drip', x, y, { radius: 14, damage: this.damage, life: 2.4, delay: 1.0, from: this });
          },
        });
      }
      return { telegraph: 0.4, cooldown: 2.8, duration: 2.2, sfx: 'coffee', script: steps };
    }
  }

  /** Núcleo do projetor: cria um projetor destrutivel que atira sozinho. */
  attack_projectorCore(game, _, prepare) {
    if (prepare) {
      return {
        telegraph: 0.6, cooldown: 6.0, duration: 1.4, sfx: 'bossHorn',
        script: [{
          at: 0.2, fn: () => {
            game.fx.banner('DESTRUA O PROJETOR!', '#ffd54f', 2.6, 44);
            if (!this.projector || this.projector.dead) {
              const room = game.room;
              const cx = room.w / 2, cy = room.h / 2 - 40;
              this.projector = new Prop('projector', cx, cy, { hpScale: 2.2, requires: 'gerente' });
              room.props.push(this.projector);
              game.projectorRef = this.projector;
            }
            game.audio.sfx('print');
          },
        }],
      };
    }
  }

  /** O projetor atira sozinho enquanto estiver vivo. */
  update(dt, game) {
    super.update(dt, game);
    if (this.projector && !this.projector.dead && !this.projector.broken && this.phase >= 2) {
      this.projector.fireTimer = (this.projector.fireTimer || 0) - dt;
      if (this.projector.fireTimer <= 0) {
        this.projector.fireTimer = 1.6;
        const p = game.player;
        const a = Math.atan2(p.y - this.projector.y, p.x - this.projector.x);
        game.spawnProjectile({
          kind: 'slide', x: this.projector.x, y: this.projector.y, angle: a, speed: 180,
          damage: 1, from: 'enemy', pierce: 2, scale: 1.2,
        });
        game.audio.sfx('print', { volume: 0.2 });
      }
    }
  }

  die(game) {
    if (this.projector) this.projector.dead = true;
    super.die(game);
  }
}

const DEF = {
  id: 'gerente', name: 'O GERENTE DE PROJETOS', sprite: 'gerente', size: 44,
  floor: 4, hp: 265, speed: 30, dmg: 2, mini: true, color: '#90a4ae', music: 'boss_reuniao',
  phases: [1, 2], attacks: ['slideBeam', 'spinChair', 'drips', 'projectorCore'],
  intro: 'Pessoal, rapido alinhamento de 5 minutos sobre o seu falecimento.',
  reward: { item: 'projetor', coins: 55 },
};
