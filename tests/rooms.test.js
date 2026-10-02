/**
 * rooms.test.js — geracao procedural: 10 seeds sempre produzem um predio
 * viavel do spawn ate o boss, com todas as salas obrigatorias.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateFloor, verifyFloor, floorStats } from '../src/world/RoomGenerator.js';
import { RNG } from '../src/core/RNG.js';
import { GRID } from '../src/data/constants.js';

const SEEDS = [1, 7, 42, 1234, 9999, 31337, 424242, 5150, 8080, 2024];

test('10 seeds geram caminho viavel do spawn ate o boss', () => {
  for (const seed of SEEDS) {
    for (let floorN = 1; floorN <= 6; floorN++) {
      const floor = generateFloor(floorN, seed * 7919 + floorN);
      assert.ok(verifyFloor(floor), `seed ${seed} andar ${floorN} sem caminho ate o boss`);
      assert.equal(floor.start.type, 'spawn');
      assert.equal(floor.bossRoom.type, floorN >= 6 ? 'boss' : 'miniboss');
    }
  }
});

test('cada andar tem as salas obrigatorias', () => {
  for (const seed of SEEDS) {
    const floor = generateFloor(1 + (seed % 6), seed);
    const byType = floorStats(floor).byType;
    assert.equal(byType.spawn, 1, 'exatamente 1 spawn');
    assert.ok((byType.treasure || 0) >= 1, 'pelo menos 1 tesouro');
    assert.ok((byType.shop || 0) <= 1, 'no maximo 1 loja');
    assert.equal((byType.miniboss || 0) + (byType.boss || 0), 1, 'exatamente 1 sala de chefe');
    assert.ok((byType.combat || 0) >= 1, 'pelo menos 1 combate');
    assert.ok(floor.rooms.size >= 6, 'predio tem pelo menos 6 salas');
  }
});

test('a sala de chefe fica no caminho principal (caminho minimo curto)', () => {
  const floor = generateFloor(1, 2024);
  // distância em salas pelo BFS a partir do spawn
  const dist = new Map([[floor.start, 0]]);
  const q = [floor.start];
  while (q.length) {
    const cur = q.shift();
    for (const [dx, dy, side] of [[0, -1, 'N'], [0, 1, 'S'], [-1, 0, 'W'], [1, 0, 'E']]) {
      if (!cur.doors[side]) continue;
      const n = floor.at(cur.gx + dx, cur.gy + dy);
      if (!n || dist.has(n)) continue;
      dist.set(n, dist.get(cur) + 1);
      q.push(n);
    }
  }
  assert.ok(dist.has(floor.bossRoom), 'boss alcancavel');
  assert.ok(dist.get(floor.bossRoom) <= 8, 'boss perto do caminho principal');
});

test('portas sao simetricas entre salas vizinhas', () => {
  for (const seed of SEEDS) {
    const floor = generateFloor(3, seed);
    for (const room of floor.list) {
      if (room.doors.N) {
        const n = floor.at(room.gx, room.gy - 1);
        if (n && n.type !== 'secret') assert.ok(n.doors.S, 'porta N precisa de S no vizinho');
      }
      if (room.doors.E) {
        const n = floor.at(room.gx + 1, room.gy);
        if (n && n.type !== 'secret') assert.ok(n.doors.W, 'porta E precisa de W no vizinho');
      }
    }
  }
});

test('a mesma seed gera exatamente o mesmo predio (determinismo)', () => {
  const a = generateFloor(4, 123456);
  const b = generateFloor(4, 123456);
  const sig = f => f.list.map(r => `${r.gx},${r.gy}:${r.type}:${[...Object.entries(r.doors)].map(d => d.join('')).join('')}`).sort().join('|');
  assert.equal(sig(a), sig(b));
});

test('seeds diferentes geram predios diferentes', () => {
  const a = generateFloor(2, 111);
  const b = generateFloor(2, 222);
  const sig = f => f.list.map(r => `${r.gx},${r.gy}:${r.type}`).sort().join('|');
  assert.notEqual(sig(a), sig(b));
});

test('salas sempre dentro do grid 9x9', () => {
  for (const seed of SEEDS) {
    const floor = generateFloor(2, seed);
    for (const r of floor.list) {
      assert.ok(r.gx >= 0 && r.gx < GRID && r.gy >= 0 && r.gy < GRID, 'sala fora do grid');
    }
  }
});

test('RNG e deterministico e respeita intervalos', () => {
  const a = new RNG('teste'), b = new RNG('teste');
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
  const r = new RNG(5);
  for (let i = 0; i < 200; i++) {
    const v = r.int(3, 7);
    assert.ok(v >= 3 && v <= 7, 'int fora do intervalo');
  }
  const pick = r.sample([1, 2, 3, 4, 5], 3);
  assert.equal(pick.length, 3);
  assert.equal(new Set(pick).size, 3, 'sample sem repeticao');
});
