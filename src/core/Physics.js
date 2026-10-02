/**
 * Physics.js — movimento top-down com AABB contra o TileMap.
 * Movimento separado por eixo (resolve quinas), knockback, separacao de corpos
 * e consultas de linha de visao/parede usadas pela IA.
 */
import { TILE, SOLID_TILES } from '../data/constants.js';

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist2 = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; };
export const dist = (a, b) => Math.sqrt(dist2(a, b));
export const approach = (cur, target, delta) =>
  cur < target ? Math.min(cur + delta, target) : Math.max(cur - delta, target);

/** Caixa AABB de uma entidade (centro + meia-largura). */
export function aabb(e) {
  const hw = (e.w || 10) / 2, hh = (e.h || 10) / 2;
  return { x: e.x - hw, y: e.y - hh, w: hw * 2, h: hh * 2 };
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function circleHit(a, b, pad = 0) {
  const r = (a.radius || 6) + (b.radius || 6) + pad;
  return dist2(a, b) <= r * r;
}

/**
 * Move a entidade com colisao por eixo contra tiles solidos.
 * Retorna bitmask de colisao {x: bool, y: bool}.
 */
export function moveWithTiles(e, dx, dy, map) {
  const hit = { x: false, y: false };
  if (dx) {
    const nx = e.x + dx;
    if (!map.boxHitsSolid(nx - e.w / 2, e.y - e.h / 2, e.w, e.h)) e.x = nx;
    else {
      // encosta na parede: tenta deslizar ate 2px
      const step = Math.sign(dx);
      for (let i = 1; i <= 2; i++) {
        if (!map.boxHitsSolid(e.x + step * i - e.w / 2, e.y - e.h / 2, e.w, e.h)) { e.x += step * i; break; }
      }
      hit.x = true;
    }
  }
  if (dy) {
    const ny = e.y + dy;
    if (!map.boxHitsSolid(e.x - e.w / 2, ny - e.h / 2, e.w, e.h)) e.y = ny;
    else {
      const step = Math.sign(dy);
      for (let i = 1; i <= 2; i++) {
        if (!map.boxHitsSolid(e.x - e.w / 2, e.y + step * i - e.h / 2, e.w, e.h)) { e.y += step * i; break; }
      }
      hit.y = true;
    }
  }
  return hit;
}

/**
 * Colisao por eixo contra tiles solidos E props solidos (mesas, servidores,
 * impressoras, maquinas). Props solidos servem de cobertura no combate.
 * Funciona igual a moveWithTiles (com deslize de ate 2px nas paredes).
 */
export function moveWithSolids(e, dx, dy, map, props = null) {
  const hit = { x: false, y: false };
  const blocked = (nx, ny) => {
    if (map.boxHitsSolid(nx - e.w / 2, ny - e.h / 2, e.w, e.h)) return true;
    if (!props) return false;
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      if (p.dead || p.broken || !p.solid) continue;
      if (Math.abs(nx - p.x) < (e.w + p.w) * 0.5 - 1 && Math.abs(ny - p.y) < (e.h + p.h) * 0.5 - 1) return true;
    }
    return false;
  };
  if (dx) {
    if (!blocked(e.x + dx, e.y)) e.x += dx;
    else {
      const step = Math.sign(dx);
      for (let i = 1; i <= 2; i++) {
        if (!blocked(e.x + step * i, e.y)) { e.x += step * i; break; }
      }
      hit.x = true;
    }
  }
  if (dy) {
    if (!blocked(e.x, e.y + dy)) e.y += dy;
    else {
      const step = Math.sign(dy);
      for (let i = 1; i <= 2; i++) {
        if (!blocked(e.x, e.y + step * i)) { e.y += step * i; break; }
      }
      hit.y = true;
    }
  }
  return hit;
}

/** Aplica velocidade com aceleracao, atrito e colisao. */
export function integrate(e, dt, map, opts = {}) {
  const accel = opts.accel ?? 800, friction = opts.friction ?? 900, maxSpeed = opts.maxSpeed ?? 120;
  const ax = e.ax || 0, ay = e.ay || 0;
  if (ax || ay) {
    e.vx += ax * accel * dt;
    e.vy += ay * accel * dt;
  } else {
    const sp = Math.hypot(e.vx, e.vy);
    if (sp > 0) {
      const drop = Math.min(sp, friction * dt);
      e.vx -= (e.vx / sp) * drop;
      e.vy -= (e.vy / sp) * drop;
    }
  }
  const sp = Math.hypot(e.vx, e.vy);
  if (sp > maxSpeed) { e.vx = (e.vx / sp) * maxSpeed; e.vy = (e.vy / sp) * maxSpeed; }
  return moveWithTiles(e, e.vx * dt, e.vy * dt, map);
}

/** Empurra corpos que se sobrepoem (separacao suave, sem custo de pathfinding). */
export function separate(list, force) {
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.dead || a.noPush) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.dead || b.noPush) continue;
      let dx = b.x - a.x, dy = b.y - a.y;
      const rr = (a.radius || 6) + (b.radius || 6);
      let d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        // caso degenerado (dois corpos exatamente na mesma posicao): empurra
        // num sentido deterministico baseado no id, para nunca ficarem presos
        if (d2 < 0.0001) { dx = 1; dy = 0; d2 = 1; }
        const d = Math.sqrt(d2);
        const push = (rr - d) * force;
        const nx = dx / d, ny = dy / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
      }
    }
  }
}

/**
 * Line of Sight por amostragem de tiles (Bresenham simplificado).
 * Retorna true se nao ha tile solido entre a e b.
 */
export function hasLOS(a, b, map) {
  const steps = Math.ceil(dist(a, b) / (TILE * 0.5));
  if (steps <= 1) return true;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    if (map.isSolidAt(x, y)) return false;
  }
  return true;
}

/** Colisao circulo x tilemap (usada por projeteis e pickups). */
export function circleHitsSolid(x, y, r, map) {
  return map.boxHitsSolid(x - r, y - r, r * 2, r * 2);
}

export function reflect(vx, vy, nx, ny) {
  const dot = vx * nx + vy * ny;
  return { x: vx - 2 * dot * nx, y: vy - 2 * dot * ny };
}

export { SOLID_TILES };
