/**
 * Planilha.js — Planilha. Arquetipo RANGED.
 * Dispara numeros em ARCO (gravidade), cobrindo area. Errar a planilha e o
 * unico jeito de sair daqui.
 */
import { Enemy } from '../Enemy.js';

export class Planilha extends Enemy {
  constructor(x, y, def) { super('planilha', x, y, def); }

  performAttack(game, d) {
    const count = 3;
    for (let i = 0; i < count; i++) {
      const a = this.attackAngle + (i - 1) * 0.42;
      game.spawnProjectile({
        kind: 'number', x: this.x, y: this.y, angle: a,
        speed: 130 + i * 18, damage: this.damage, from: 'enemy',
        gravity: 90, number: game.rng.int(1, 4),
      });
    }
    game.audio.sfx('print');
    game.fx.burst(this.x, this.y, 'paper', { dir: this.attackAngle, count: 4 });
  }
}
