/**
 * Bug.js — Bug. Arquetipo SWARM (e SNIPER quando elite).
 * Aparece em enxame de 4-6, corre em zigzag e estoura em bits digitais.
 * A versao elite (Bug Ancestral) fica parada mirando por 1s e dispara rajada.
 */
import { Enemy } from '../Enemy.js';

export class Bug extends Enemy {
  constructor(x, y, def) { super('bug', x, y, def); this.stutter = 0; }

  update(dt, game) {
    super.update(dt, game);
    // "flicker" digital: pisca como sprite corrompido
    this.stutter -= dt;
    if (this.stutter <= 0) this.stutter = game.rng.range(0.3, 1.4);
  }

  get animAnim() {
    if (this.arch === 'sniper') return super.animAnim === 'walk' ? 'swarm' : super.animAnim;
    return super.animAnim === 'walk' ? 'swarm' : (super.animAnim === 'attack' ? 'attack' : super.animAnim);
  }
}
