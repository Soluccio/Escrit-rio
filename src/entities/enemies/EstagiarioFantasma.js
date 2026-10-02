/**
 * EstagiarioFantasma.js — Estagiario Fantasma. Arquetipo SUPPORT.
 * Aparece e some (fade/blink), teleporta para perto do player e empurra.
 * O cracha flutua: ele morreu esperando o contrato.
 */
import { Enemy, STATE } from '../Enemy.js';

export class EstagiarioFantasma extends Enemy {
  constructor(x, y, def) { super('fantasma', x, y, def); this.fadeAlpha = 1; }

  update(dt, game) {
    super.update(dt, game);
    // fica translucido quando longe (espreitando)
    const target = this.state === STATE.CHASE ? 0.85 : 0.45;
    this.fadeAlpha += (target - this.fadeAlpha) * Math.min(1, dt * 4);
  }

  performAttack(game, d) {
    game.spawnHazard('push', this.x, this.y, { radius: 34, life: 0.3, from: this, damage: 0 });
    game.spawnHazard('shock', this.x, this.y, { radius: this.atkRange, damage: this.damage, life: 0.35, from: this, visual: 'ghost' });
    game.fx.ring(this.x, this.y, 4, 34, '#dce7ff', 0.3, 2);
    game.audio.sfx('ghost');
  }

  get animAnim() {
    const a = super.animAnim;
    if (a === 'walk') return 'fade';
    return a;
  }

  draw(ctx, sprites, game) {
    const before = ctx.globalAlpha;
    ctx.globalAlpha = before * (this.fadeAlpha ?? 1);
    super.draw(ctx, sprites, game);
    ctx.globalAlpha = before;
  }
}
