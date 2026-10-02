/**
 * Prop.js — moveis e obstaculos: mesas, cadeiras, plantas, impressoras.
 * Props solidos bloqueiam movimento; destrutivos (impressora, projetor, mesa)
 * tem vida e soltam pickups ao quebrar.
 */
import { TILE } from '../data/constants.js';
import { overlaps } from '../core/Physics.js';

export const PROP_DEFS = {
  desk:      { w: 32, h: 16, solid: true, hp: 12, destructible: true, drops: 'clip', tall: 12 },
  chair:     { w: 14, h: 14, solid: true, hp: 6, destructible: true, drops: 'none', tall: 4 },
  plant:     { w: 14, h: 12, solid: true, hp: 8, destructible: true, drops: 'coin', tall: 8 },
  printer:   { w: 16, h: 16, solid: true, hp: 16, destructible: true, drops: 'toner', tall: 6 },
  trash:     { w: 14, h: 14, solid: true, hp: 4, destructible: true, drops: 'coin', tall: 3 },
  frame:     { w: 16, h: 16, solid: false, hp: 0, destructible: false, decor: true },
  elevator:  { w: 32, h: 32, solid: false, hp: 0, destructible: false, interact: 'elevator' },
  coffeemaker: { w: 16, h: 22, solid: true, hp: 0, destructible: false, interact: 'coffee' },
  vending:   { w: 16, h: 22, solid: true, hp: 0, destructible: false, interact: 'shop' },
  whiteboard:{ w: 16, h: 14, solid: true, hp: 8, destructible: true, drops: 'none' },
  watercooler: { w: 14, h: 20, solid: true, hp: 10, destructible: true, drops: 'coffee' },
  server:    { w: 16, h: 26, solid: true, hp: 14, destructible: true, drops: 'clip' },
  speaker:   { w: 14, h: 14, solid: true, hp: 10, destructible: true, drops: 'coin' },
  projector: { w: 16, h: 14, solid: true, hp: 30, destructible: true, drops: 'none', requires: 'gerente' },
};

export class Prop {
  constructor(kind, x, y, opts = {}) {
    const d = PROP_DEFS[kind] || PROP_DEFS.desk;
    this.kind = kind;
    this.x = x; this.y = y;              // centro
    this.w = d.w; this.h = d.h;
    this.solid = d.solid;
    this.destructible = !!d.destructible;
    this.hp = d.hp * (opts.hpScale || 1);
    this.maxHp = this.hp;
    this.tall = d.tall || 0;
    this.interact = d.interact || null;
    this.decor = !!d.decor;
    this.drops = d.drops || 'none';
    this.dead = false;
    this.broken = false;
    this.hitFlash = 0;
    this.used = false;                    // maquina de cafe ja usada
    this.spin = !!opts.spin;              // cadeiras giratorias (boss)
    this.anchor = opts.anchor || null;    // gira em volta de um ponto
    this.time = 0;
    this.opts = opts;
  }

  get spriteKey() {
    if (this.kind === 'printer' && this.broken) return 'prop:printer_broken';
    if (this.kind === 'coffeemaker' && this.used) return 'prop:coffeemaker_used';
    if (this.kind === 'desk' && this.opts.bare) return 'prop:desk_bare';
    return `prop:${this.kind}`;
  }

  get aabb() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }

  update(dt) {
    this.time += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.spin && this.anchor) {
      this.angle = (this.angle || 0) + dt * (this.opts.spinSpeed || 2.2);
      this.x = this.anchor.x + Math.cos(this.angle) * (this.opts.orbit || 46);
      this.y = this.anchor.y + Math.sin(this.angle) * (this.opts.orbit || 46);
    }
  }

  /** Dano no prop. Retorna true se quebrou agora. */
  damage(amount) {
    if (!this.destructible || this.broken) return false;
    this.hp -= amount;
    this.hitFlash = 0.1;
    if (this.hp <= 0) {
      this.broken = true;
      if (this.opts.vanish !== false) this.dead = true;
      return true;
    }
    return false;
  }

  hitsCircle(x, y, r) {
    if (!this.solid) return false;
    const a = this.aabb;
    const cx = Math.max(a.x, Math.min(x, a.x + a.w));
    const cy = Math.max(a.y, Math.min(y, a.y + a.h));
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  }

  hitsBox(b) { return this.solid && overlaps(this.aabb, b); }

  draw(ctx, sprites) {
    const key = this.spriteKey;
    const info = sprites.info(key);
    const f = info ? sprites.frameAt(key, this.time, true) : 0;
    const flash = this.hitFlash > 0 && this.destructible;
    sprites.draw(ctx, key, f, this.x, this.y, {
      flash, rot: this.spin ? (this.angle || 0) : 0, spin: true,
    });
    // barra de vida em props grandes
    if (this.destructible && !this.dead && this.hp < this.maxHp && this.maxHp > 6) {
      const w = this.w;
      const pct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = '#00000088';
      ctx.fillRect(this.x - w / 2, this.y - this.h / 2 - 4, w, 2);
      ctx.fillStyle = '#ff8fa3';
      ctx.fillRect(this.x - w / 2, this.y - this.h / 2 - 4, w * pct, 2);
    }
  }
}

/** Gera props tematicos de um andar, evitando sobrepor portas/passagens. */
export function decorateRoom(map, rng, floorN, kind = 'combat') {
  const props = [];
  const themeProps = {
    1: ['desk', 'chair', 'plant', 'trash', 'watercooler', 'frame'],
    2: ['desk', 'chair', 'trash', 'frame', 'vending'],
    3: ['desk', 'chair', 'plant', 'watercooler', 'frame'],
    4: ['desk', 'chair', 'whiteboard', 'speaker', 'plant'],
    5: ['server', 'desk', 'chair', 'trash', 'watercooler'],
    6: ['desk', 'chair', 'speaker', 'plant', 'frame'],
  }[floorN] || ['desk', 'chair', 'plant'];

  const baseCount = { combat: 9, treasure: 4, shop: 3, rest: 4, event: 4, secret: 4, miniboss: 5, boss: 3, spawn: 5 }[kind] ?? 6;
  const count = baseCount + rng.int(0, 3);
  const midX = map.w / 2, midY = map.h / 2;
  const used = [];
  for (let i = 0; i < count; i++) {
    const kindPick = rng.pick(themeProps);
    const cx = rng.int(3, map.cols - 4), cy = rng.int(3, map.rows - 4);
    const x = cx * TILE + TILE / 2, y = cy * TILE + TILE / 2;
    // nao obstrui centro, portas nem o caminho para portas
    if (Math.abs(x - midX) < 40 && Math.abs(y - midY) < 34) continue;
    if (map.solidCountIn(x - 24, y - 24, 48, 48) > 0) continue;
    const w = PROP_DEFS[kindPick].w, h = PROP_DEFS[kindPick].h;
    if (used.some(u => Math.abs(u.x - x) < 34 && Math.abs(u.y - y) < 26)) continue;
    // mantem os corredores das portas livres (faixa central)
    const onDoorLane = (Math.abs(x - midX) < 22) || (Math.abs(y - midY) < 22);
    if (onDoorLane && rng.chance(0.7)) continue;
    used.push({ x, y });
    props.push(new Prop(kindPick, x, y, { hpScale: 1 + (floorN - 1) * 0.2 }));
    // mesa ganha uma cadeira companheira
    if (kindPick === 'desk' && rng.chance(0.7)) {
      const dy = rng.chance(0.5) ? 16 : -16;
      if (!map.boxHitsSolid(x - 7, y + dy - 7, 14, 14)) {
        props.push(new Prop('chair', x + rng.int(-8, 8), y + dy, { vanish: true }));
      }
    }
  }
  return props;
}
