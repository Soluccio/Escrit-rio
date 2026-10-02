/**
 * rooms.test.js — geracao procedural: 10 seeds sempre produzem um predio
 * viavel do spawn ate o boss, com todas as salas obrigatorias.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateFloor, verifyFloor, floorStats } from '../src/world/RoomGenerator.js';
import { RNG } from '../src/core/RNG.js';
import { GRID, TILE, ROOM_COLS, ROOM_ROWS, BOSS_COLS, BOSS_ROWS, CAMERA, VIEW_W, VIEW_H } from '../src/data/constants.js';

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

test('salas de combate tem 28x16 tiles e as arenas 32x18 (playtest 1)', () => {
  const floor = generateFloor(3, 77);
  for (const r of floor.list) {
    const big = r.type === 'miniboss' || r.type === 'boss';
    assert.equal(r.cols, big ? BOSS_COLS : ROOM_COLS, `${r.type} com largura errada`);
    assert.equal(r.rows, big ? BOSS_ROWS : ROOM_ROWS, `${r.type} com altura errada`);
    assert.equal(r.w, r.cols * TILE);
    assert.equal(r.h, r.rows * TILE);
  }
  // combat: 448x256 | arena: 512x288
  const combat = floor.list.find(r => r.type === 'combat');
  assert.equal(combat.w, 448);
  assert.equal(combat.h, 256);
  const arena = floor.bossRoom;
  assert.equal(arena.w, 512);
  assert.equal(arena.h, 288);
});

test('o zoom mostra quase a sala inteira (76-78% da largura, 74-76% da altura)', () => {
  const viewW = VIEW_W / CAMERA.zoom;      // 343 px de mundo visiveis
  const viewH = VIEW_H / CAMERA.zoom;      // 193 px
  const roomW = ROOM_COLS * TILE;          // 448
  const roomH = ROOM_ROWS * TILE;          // 256
  const pctW = viewW / roomW, pctH = viewH / roomH;
  assert.ok(pctW > 0.75 && pctW < 0.79, `largura visivel ${(pctW * 100).toFixed(0)}% (esperado ~77%)`);
  assert.ok(pctH > 0.73 && pctH < 0.77, `altura visivel ${(pctH * 100).toFixed(0)}% (esperado ~75%)`);
  // com zoom 1.4 tudo fica 40% maior na tela
  assert.equal(CAMERA.zoom, 1.4);
  assert.equal(CAMERA.zoomBoss, 1.15);
  // a arena de boss cabe inteira com folga no zoom de boss
  assert.ok(BOSS_COLS * TILE <= VIEW_W / CAMERA.zoomBoss * 1.5);
  assert.ok(BOSS_ROWS * TILE <= VIEW_H / CAMERA.zoomBoss * 1.5);
});

test('nenhum prop solido bloqueia o corredor das portas (sala sempre atravessavel)', () => {
  for (const seed of SEEDS) {
    const floor = generateFloor(1 + (seed % 6), seed);
    for (const room of floor.list) {
      room.map.buildBox('floor', room.rng);
      const props = room.def.props ? room.def.props(room.map, room.rng, room.floorN) : [];
      const mx = room.w / 2, my = room.h / 2;
      for (const prop of props) {
        if (!prop.solid) continue;
        const laneX = Math.abs(prop.x - mx) < 30 - prop.w / 2;
        const laneY = Math.abs(prop.y - my) < 30 - prop.h / 2;
        assert.ok(!(laneX || laneY), `${prop.kind} bloqueando o corredor em ${room.gx},${room.gy} (${room.type})`);
      }
    }
  }
});

test('salas menores continuam com props de sobra e sem encher o mapa', () => {
  const floor = generateFloor(1, 4242);
  const combat = floor.list.filter(r => r.type === 'combat');
  assert.ok(combat.length >= 3, 'andar tem salas de combate');
  for (const room of combat) {
    room.map.buildBox('floor', room.rng);
    const props = room.def.props ? room.def.props(room.map, room.rng, room.floorN) : [];
    // mobiliado, mas com area de manobra (sala 28x16 = 448 celulas uteis)
    assert.ok(props.length >= 6, `${props.length} props numa sala de combate (pouco mobilado)`);
    const area = (room.cols - 2) * (room.rows - 2);
    assert.ok(props.length < area * 0.25, `${props.length} props para ${area} tiles (mapa entupido)`);
  }
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
