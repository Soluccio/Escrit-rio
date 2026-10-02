/**
 * Weapons.js — armas e habilidades que o Game oferece ao player e aos itens:
 * golpe corpo a corpo, feixe que atravessa, raio em cadeia, rastro de tinta,
 * quebra de parede secreta e busca de alvos proximos (props/executaveis).
 * Extraido do Game.js para manter os arquivos abaixo de 400 linhas.
 */
import { dist } from './Physics.js';
import { TILE, TUNING, T } from '../data/constants.js';
import { INTERACT_DEFS } from '../entities/Interactable.js';
import { ITEMS } from '../data/items.js';

export function meleeSwing(game, source, x, y, length, arc, damage, angle, knockback = 200) {
  for (const e of game.room.entities) {
    if (e.dead || !e.isEnemy) continue;
    const d = dist({ x, y }, e);
    if (d > length + e.radius) continue;
    const a = Math.atan2(e.y - y, e.x - x);
    let diff = Math.abs(a - angle);
    while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
    if (diff <= arc) {
      game.combat.hitEnemy(e, damage, { fromX: x, fromY: y, knockback });
    }
  }
  for (const prop of game.room.props) {
    if (prop.destructible && !prop.broken && prop.hitsCircle(x, y, length * 0.6)) {
      game.combat.hitProp(prop, damage);
    }
  }
  game.audio.sfx('staple');
}

/** Feixe que atravessa (marca-texto). */
export function beamAttack(game, source, angle, length, width, damage) {
  const steps = Math.ceil(length / 8);
  for (let i = 1; i <= steps; i++) {
    const x = source.x + Math.cos(angle) * (i * 8);
    const y = source.y + Math.sin(angle) * (i * 8);
    if (game.room.map.isSolidAt(x, y)) break;
    game.fx.burst(x, y, 'ink', { count: 1, size: 2, speedMult: 0.4 });
    for (const e of game.room.entities) {
      if (e.dead || !e.isEnemy) continue;
      if (Math.abs(e.x - x) < width + e.radius && Math.abs(e.y - y) < width + e.radius) {
        game.combat.hitEnemy(e, damage, { fromX: source.x, fromY: source.y, angle });
      }
    }
  }
}

/** Raio em cadeia (cabo HDMI). */
export function chainAttack(game, source, range, jumps, damage, stun, angle) {
  let from = source;
  let remaining = jumps;
  const hit = new Set();
  while (remaining-- > 0) {
    let best = null, bestD = range;
    for (const e of game.room.entities) {
      if (e.dead || !e.isEnemy || hit.has(e.id)) continue;
      const d = dist(from, e);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (!best) break;
    hit.add(best.id);
    game.fx.burst(best.x, best.y, 'spark', { count: 6 });
    game.fx.ring(best.x, best.y, 2, 14, '#00e676', 0.2, 1);
    game.combat.hitEnemy(best, damage, { stun, fromX: from.x, fromY: from.y });
    from = best;
  }
  if (!hit.size) game.audio.sfx('click', { pitch: 0.5 });
}

/** Rastro de tinta (bencao Marca-texto). */
export function addInkTrail(game, x, y) {
  const p = game.player;
  game.hazards.spawn('ink', x, y, {
    radius: 10, damage: p.stats.trailDamage, life: 2.5, from: null,
  });
}

/** Dano na parede secreta (retorna true se quebrou/atingiu). */
export function damageSecretWall(game, x, y, damage) {
  const map = game.room.map;
  const cx = Math.floor(x / 16), cy = Math.floor(y / 16);
  if (map.get(cx, cy) !== T.SECRET) return false;
  game.room.secretHp = (game.room.secretHp || 0) + damage;
  game.fx.burst(x, y, 'dust', { count: 5 });
  game.audio.sfx('stamp', { pitch: 0.8, volume: 0.2 });
  if (game.room.secretHp >= 6) {
    game.director.breakSecretWall(game.room, cx, cy);
  }
  return true;
}

export function nearestProp(game, x, y, maxDist) {
  let best = null, bestD = maxDist;
  for (const p of game.room.props) {
    if (p.dead) continue;
    const d = dist({ x, y }, p);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

export function nearestExecutable(game, x, y, maxDist) {
  let best = null, bestD = maxDist;
  for (const e of game.room.entities) {
    if (e.dead || !e.isEnemy || !e.executable) continue;
    const d = dist({ x, y }, e);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

export function findInteractable(game, x, y) {
  for (const inter of game.room.interactables || []) {
    if (inter.used && inter.kind !== 'elevator' && inter.kind !== 'shop') continue;
    if (dist({ x, y }, inter) < inter.radius + 8) return inter;
  }
  return null;
}

export function useInteractable(game, inter) {
  if (inter.kind === 'shop') { game.director.openShop(inter); return true; }
  const ok = inter.interact(this);
  if (ok && game.player) { /* feedback */ }
  return ok;
}

// ================================================================ render