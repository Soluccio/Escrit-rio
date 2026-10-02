/**
 * CaboEmaranhado.js — Cabo Emaranhado. Arquetipo TANK (controle).
 * Ataque em area com wind-up longo que ENROLA o player: aplica lentidao
 * (slow) e puxa levemente para o centro.
 */
import { Enemy } from '../Enemy.js';

export class CaboEmaranhado extends Enemy {
  constructor(x, y, def) { super('cabo', x, y, def); }

  performAttack(game, d) {
    const r = this.def.aoe || 30;
    game.spawnHazard('shock', this.x, this.y, {
      radius: r, damage: this.damage, life: 0.4, from: this, slow: 0.45, slowTime: 2.0, visual: 'spark',
    });
    game.fx.ring(this.x, this.y, 4, r, '#00e676', 0.35, 2);
    // chicote de cabo
    game.fx.slash(this.x, this.y, this.attackAngle, 22, '#cfd8dc');
    game.audio.sfx('cable');
    game.camera.addShake(1.8);
  }

  get animAnim() {
    const a = super.animAnim;
    if (a === 'walk') return 'wrap';
    return a === 'attack' ? 'wrap' : a;
  }
}
