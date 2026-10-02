/**
 * Grampeador.js — Grampeador. Arquetipo RUSHER (hop).
 * Anda aos pulos (squash/stretch), grampeia a curta distancia.
 * Leva vantagem em corredores: knockback forte no acerto.
 */
import { Enemy, STATE } from '../Enemy.js';
import { lerp } from '../../core/Physics.js';

export class Grampeador extends Enemy {
  constructor(x, y, def) { super('grampeador', x, y, def); this.hopTimer = 0; }

  update(dt, game) {
    super.update(dt, game);
    // squash/stretch do pulo
    this.hopTimer += dt * (this.state === STATE.CHASE ? 6 : 3);
    this.squash = 1 + Math.sin(this.hopTimer) * 0.12;
  }

  performAttack(game, d) {
    super.performAttack(game, d);
    if (d < 24) {
      // grampeia: dano extra se o player estiver colado
      game.fx.slash(this.x, this.y, this.attackAngle, 12, '#b0bec5');
      game.camera.addShake(1.2);
    }
  }

  draw(ctx, sprites, game) {
    const s = this.squash || 1;
    super.draw(ctx, sprites, game);
  }
}
