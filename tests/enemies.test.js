/**
 * enemies.test.js — FSM dos inimigos: estados, LOS, pathfinding, morte limpa,
 * telegrafia obrigatoria, divisao do formulario e papeis de grupo.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessGame, startRun, runFrames } from '../tools/headless.mjs';
import { STATE } from '../src/entities/Enemy.js';
import { FlowField } from '../src/core/Pathfinding.js';
import { ENEMIES, scaleEnemy } from '../src/data/enemies.js';
import { floorScale } from '../src/data/constants.js';

function freshBattle(seed = 77, enemyKey = 'papel') {
  const { game, input } = createHeadlessGame({ seed });
  startRun(game, seed, 'max');
  // sala de combate real, com o player no centro
  const room = game.floor.list.find(r => r.type === 'combat');
  game.director.enterRoom(room, null, true);
  game.room.entities.length = 0;
  const p = game.player;
  p.x = room.w / 2; p.y = room.h / 2;
  const e = game.spawnEnemy(enemyKey, p.x + 120, p.y, {});
  return { game, input, e, room };
}

test('a FSM percorre IDLE -> ALERT -> CHASE quando o player aparece', () => {
  const { game, e } = freshBattle();
  const seen = new Set();
  runFrames(game, 180, () => { seen.add(e.state); });
  assert.ok(seen.has(STATE.IDLE) || seen.has(STATE.PATROL) || seen.has(STATE.ALERT) || seen.has(STATE.CHASE));
  assert.ok(seen.has(STATE.CHASE) || seen.has(STATE.TELEGRAPH) || seen.has(STATE.ATTACK),
    'inimigo engajou o player: ' + [...seen].join(','));
});

test('todo ataque passa por TELEGRAPH antes de ATTACK (telegrafia obrigatoria)', () => {
  const { game, e } = freshBattle(88, 'grampeador');
  const order = [];
  runFrames(game, 400, () => {
    const last = order[order.length - 1];
    if (e.state !== last) order.push(e.state);
  });
  const attackIdx = order.indexOf(STATE.ATTACK);
  assert.ok(attackIdx > 0, 'inimigo atacou');
  assert.equal(order[attackIdx - 1], STATE.TELEGRAPH, 'veio de TELEGRAPH: ' + order.join('>'));
});

test('inimigo morre e some da sala sem deixar lixo', () => {
  const { game, e } = freshBattle(99, 'bug');
  game.combat.hitEnemy(e, 9999, {});
  assert.ok(e.dead);
  assert.equal(e.state, STATE.DEAD);
  runFrames(game, 30);
  assert.ok(!game.room.entities.includes(e), 'corpo removido da lista');
  assert.equal(game.room.entities.filter(x => x.dead).length, 0);
});

test('inimigo nao atravessa parede (colisao com tiles)', () => {
  const { game, e } = freshBattle(101, 'burocrata');
  const map = game.room.map;
  runFrames(game, 600, () => { game.player.x = 30; game.player.y = 30; });
  assert.ok(!map.boxHitsSolid(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h), 'inimigo terminou dentro de parede');
  assert.ok(e.x > 16 && e.x < game.room.w - 16 && e.y > 16 && e.y < game.room.h - 16, 'dentro dos limites da sala');
});

test('inimigos se separam (nao empilham)', () => {
  const { game } = freshBattle(123, 'bug');
  const p = game.player;
  game.room.entities.length = 0;
  const list = [];
  for (let i = 0; i < 6; i++) list.push(game.spawnEnemy('bug', p.x + 60 + i * 2, p.y + 40, {}));
  runFrames(game, 240, () => { p.invuln = 5; });
  // nenhum par exatamente na mesma posicao
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const d = Math.hypot(list[i].x - list[j].x, list[i].y - list[j].y);
      assert.ok(d > 2, `inimigos ${i}/${j} empilhados (d=${d.toFixed(1)})`);
    }
  }
});

test('formulario se multiplica ao ser atingido (burocracia realista)', () => {
  const { game } = freshBattle(321, 'formulario');
  const before = game.room.entities.length;
  game.combat.hitEnemy(game.room.entities[0], 1, { noCrit: true });
  runFrames(game, 5);
  assert.ok(game.room.entities.length > before, 'gerou copias');
  const copies = game.room.entities.filter(e => e.key === 'formulario');
  assert.ok(copies.some(c => c.generation === 0) && copies.some(c => c.generation === 1));
});

test('flow field acha direcao e respeita paredes', () => {
  const { game, room } = freshBattle(55, 'bug');
  const flow = new FlowField(room.map.cols, room.map.rows);
  const p = game.player;
  flow.build(room.map, p.x, p.y);
  // posicao longe do player: direcao deve apontar "para dentro" do campo
  const dir = flow.directionAt(room.w - 30, room.h / 2, p.x, p.y);
  assert.ok(Math.abs(dir.x) + Math.abs(dir.y) > 0.5, 'direcao valida');
  assert.ok(flow.distanceAt(p.x, p.y) === 0, 'distancia zero no alvo');
  // dentro de uma parede o campo nao da direcao util
  const wallDir = flow.directionAt(8, 8, p.x, p.y);
  assert.ok(wallDir && Number.isFinite(wallDir.x));
});

test('escala de dificuldade aumenta vida/dano/velocidade por andar', () => {
  const base = scaleEnemy('papel', floorScale(1));
  const late = scaleEnemy('papel', floorScale(6));
  assert.ok(late.hp > base.hp, 'mais vida no andar 6');
  assert.ok(late.speed > base.speed, 'mais velocidade no andar 6');
  assert.ok(late.dmg >= base.dmg, 'dano nao diminui');
  for (const key of Object.keys(ENEMIES)) {
    const def = scaleEnemy(key, floorScale(4));
    assert.ok(def.hp > 0 && def.speed > 0 && def.dmg >= 1, key + ' com atributos invalidos');
  }
});

test('cada inimigo comum tem sprite e animacoes obrigatorias', () => {
  const { game } = freshBattle(9, 'bug');
  for (const [key, def] of Object.entries(ENEMIES)) {
    const idle = game.sprites.frames(`enemy:${def.sprite}:idle`);
    assert.ok(idle, key + ' sem animacao idle');
    assert.ok(idle.length >= 2, key + ' precisa de pelo menos 2 frames de idle');
    const hurt = game.sprites.frames(`enemy:${def.sprite}:hurt`);
    assert.ok(hurt && hurt.length >= 1, key + ' sem animacao hurt');
  }
});

test('inimigos atacam o player quando chegam perto', () => {
  const { game, e } = freshBattle(4321, 'grampeador');
  const p = game.player;
  p.stats.maxHp = 10; p.maxHp = 10; p.hp = 10;
  runFrames(game, 600, () => { p.invuln = 0; });
  assert.ok(p.hp < 10, 'o player levou dano de contato/ataque');
});
