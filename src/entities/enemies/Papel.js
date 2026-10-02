/**
 * Papel.js — Pilha de Papel. Arquetipo RUSHER.
 * Corre direto para cima do player e, se estiver longe, arremessa folhas em leque.
 * Telegrafa a investida "pulando" (aura vermelha + linha de aviso).
 */
import { Enemy, STATE } from '../Enemy.js';

export class Papel extends Enemy {
  constructor(x, y, def) { super('papel', x, y, def); }

  performAttack(game, d) {
    if (d > 60) {
      // leque de folhas 3x5
      for (let i = -1; i <= 1; i++) {
        game.spawnProjectile({
          kind: 'paperball', x: this.x, y: this.y, angle: this.attackAngle + i * 0.28,
          speed: 110, damage: this.damage, from: 'enemy', paper: true,
        });
      }
      game.audio.sfx('paper');
    } else {
      super.performAttack(game, d);
    }
  }

  draw(ctx, sprites, game) {
    super.draw(ctx, sprites, game);
    // folhinhas soltas caindo (charme)
    if (!this.dead && Math.sin(this.time * 3) > 0.9) {
      ctx.fillStyle = '#e8e8f0';
      ctx.fillRect(this.x - 8, this.y + 6, 2, 2);
    }
  }
}
