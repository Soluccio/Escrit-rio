/**
 * Burocrata.js — Burocrata. Arquetipo TANK.
 * Lento, muito HP, ataque em area com wind-up longo.
 * Levanta um ESCUDO DE PAPELADA e fica imune pela frente — obriga o player a
 * flanquear ou usar execucao.
 */
import { Enemy, STATE } from '../Enemy.js';

export class Burocrata extends Enemy {
  constructor(x, y, def) { super('burocrata', x, y, def); this.shieldTimer = 0; this.shielded = false; }

  update(dt, game) {
    super.update(dt, game);
    this.shieldTimer -= dt;
    if (this.shieldTimer <= 0) {
      this.shieldTimer = game.rng.range(4, 7);
      this.shielded = true;
      this.shieldTime = 2.4;
      game.fx.ring(this.x, this.y, 6, 30, '#e8e8f0', 0.35, 2);
      game.audio.sfx('stamp');
    }
    if (this.shielded) {
      this.shieldTime -= dt;
      if (this.shieldTime <= 0) this.shielded = false;
    }
  }

  /** Escudo reduz dano frontal em 70%. */
  onHit(dmg, opts) {
    super.onHit(dmg, opts);
  }

  takeReducedDamage(amount, angleFrom) {
    const toEnemy = Math.atan2(this.y - angleFrom.y, this.x - angleFrom.x);
    const delta = Math.abs(normalizeAngle(toEnemy - this.attackAngle));
    return this.shielded && delta < 1.2 ? amount * 0.3 : amount;
  }

  get animAnimOverride() { return this.shielded ? 'shield' : null; }
  get animAnim() {
    if (this.shielded) return 'shield';
    return super.animAnim;
  }

  performAttack(game, d) {
    super.performAttack(game, d);
    game.fx.ring(this.x, this.y, 8, this.def.aoe || 40, '#e8e8f0', 0.35, 3);
  }
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
