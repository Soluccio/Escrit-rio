/**
 * Telefone.js — Telefone. Arquetipo RANGED.
 * Mantem 3-5 tiles de distancia e dispara ondas sonoras em cone.
 * Imune a ataques sonoros (bencao Fone de Ouvido tambem protege o player).
 */
import { Enemy, STATE } from '../Enemy.js';

export class Telefone extends Enemy {
  constructor(x, y, def) { super('telefone', x, y, def); this.ringCount = 0; }

  performAttack(game, d) {
    const count = 3;
    for (let i = 0; i < count; i++) {
      game.spawnProjectile({
        kind: 'soundwave', x: this.x, y: this.y, angle: this.attackAngle + (i - 1) * 0.22,
        speed: 120, damage: this.damage, from: 'enemy', sound: true, pierce: 0,
        scale: 1.2,
      });
    }
    game.fx.ring(this.x, this.y, 6, 26, '#81c784', 0.3, 2);
    game.audio.sfx('ring');
    this.ringCount++;
  }
}
