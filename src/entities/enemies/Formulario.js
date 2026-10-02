/**
 * Formulario.js — Formulario Vivo. Arquetipo SWARM.
 * Ao ser atingido se MULTIPLICA (ate 2 geracoes), ficando menor e mais rapido.
 * Burocracia real: quanto mais voce bate, mais formulario aparece.
 */
import { Enemy } from '../Enemy.js';

export class Formulario extends Enemy {
  constructor(x, y, def, generation = 0) {
    super('formulario', x, y, def);
    this.generation = generation;
    if (generation > 0) {
      this.scale = 1 - generation * 0.2;
      this.speed *= 1 + generation * 0.25;
      this.radius *= this.scale;
    }
  }

  onHit(dmg, opts) {
    super.onHit(dmg, opts);
    if (this.hp > 0 && this.generation < 2) this.pendingSplit = true;
  }

  /** Cria as copias quando atingido. */
  update(dt, game) {
    super.update(dt, game);
    if (this.pendingSplit) {
      this.pendingSplit = false;
      const def = { ...this.def, hp: Math.max(2, Math.round(this.def.hp * 0.45)) };
      for (let i = 0; i < 2; i++) {
        const a = game.rng.angle();
        const child = new Formulario(this.x + Math.cos(a) * 10, this.y + Math.sin(a) * 10, def, this.generation + 1);
        child.hp = child.maxHp = def.hp;
        game.room.entities.push(child);
        game.fx.burst(child.x, child.y, 'paper', { count: 5 });
      }
      game.audio.sfx('paper');
    }
  }
}
