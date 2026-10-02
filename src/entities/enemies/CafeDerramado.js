/**
 * CafeDerramado.js — Cafe Derramado. Arquetipo SUPPORT.
 * Deixa poças de dano continuo no chao e "borbulha" quando o player se
 * aproxima. Destruir a poça espalha gotas quentes.
 */
import { Enemy, STATE } from '../Enemy.js';

export class CafeDerramado extends Enemy {
  constructor(x, y, def) { super('cafe', x, y, def); this.poolTimer = 0; }

  update(dt, game) {
    super.update(dt, game);
    this.poolTimer -= dt;
    if (this.poolTimer <= 0 && !this.dead) {
      this.poolTimer = game.rng.range(2.4, 4.0);
      game.spawnHazard('coffee', this.x, this.y, {
        radius: 14 + game.rng.int(0, 4), damage: 1, life: 7, from: this,
      });
    }
  }

  get animAnim() {
    const a = super.animAnim;
    if (a === 'attack' || a === 'shield') return 'attack';
    if (a === 'walk') return 'idle';
    return a;
  }
}
