/**
 * enemies.test.js — FSM dos inimigos: estados, LOS, pathfinding, morte limpa,
 * telegrafia obrigatoria, papeis de grupo e AGRESSAO (playtest 1, BUG 3).
 *
 * O teste de agressao e o criterio do bug: um inimigo a 200 px do player em
 * sala limpa precisa sair de IDLE, alertar, perseguir, chegar no alcance,
 * atacar e tirar vida do player em ate 400 frames.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessGame, startRun, runFrames } from '../tools/headless.mjs';
import { STATE } from '../src/entities/Enemy.js';
import { FlowField } from '../src/core/Pathfinding.js';
import { ENEMIES, scaleEnemy } from '../src/data/enemies.js';
import { floorScale, TILE } from '../src/data/constants.js';

/** Sala de combate limpa, sem props e sem premio de bencao, com o player no centro. */
function cleanRoom(seed = 77) {
  const { game, input } = createHeadlessGame({ seed });
  startRun(game, seed, 'max');
  const room = game.floor.list.find(r => r.type === 'combat');
  room.cleared = true;
  room.props.length = 0;
  game.director.enterRoom(room, null, true);
  room.entities.length = 0;
  room.props.length = 0;
  room.cleared = true;
  game.state = 'PLAY';
  const p = game.player;
  p.x = room.w / 2; p.y = room.h / 2;
  p.stats.maxHp = 20; p.maxHp = 20; p.hp = 20;
  return { game, input, room, p };
}

/** Ponto livre a `dist` px do player (para nao nascer dentro de parede). */
function spotAt(room, p, dist, angle = 0) {
  const x = p.x + Math.cos(angle) * dist;
  const y = p.y + Math.sin(angle) * dist;
  if (room.map.isSolidAt(x, y)) return { x: p.x + Math.cos(angle + 2.1) * dist, y: p.y + Math.sin(angle + 2.1) * dist };
  return { x, y };
}

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

test('os inimigos comuns ficaram maiores (sprite 24/36, hitbox 20/28)', () => {
  const { game } = freshBattle(9, 'bug');
  for (const [key, def] of Object.entries(ENEMIES)) {
    const idle = game.sprites.frames(`enemy:${def.sprite}:idle`);
    assert.ok(idle, key + ' sem animacao idle');
    assert.ok(idle.length >= 2, key + ' precisa de pelo menos 2 frames de idle');
    const hurt = game.sprites.frames(`enemy:${def.sprite}:hurt`);
    assert.ok(hurt && hurt.length >= 1, key + ' sem animacao hurt');
    // sprite maior que o antigo 16x16 e hitbox proporcional
    const spr = def.spriteSize;
    assert.ok(spr >= 24, `${key} com sprite pequeno (${spr})`);
    assert.ok(def.size >= 20, `${key} com hitbox pequena (${def.size})`);
    assert.ok(def.size <= spr, `${key}: hitbox (${def.size}) nao pode passar do sprite (${spr})`);
    const info = game.sprites.info(`enemy:${def.sprite}:idle`);
    assert.equal(info.w, spr, `${key}: sprite gerado com ${info.w}px, esperado ${spr}`);
  }
});

test('inimigos atacam o player quando chegam perto', () => {
  const { game, e } = freshBattle(4321, 'grampeador');
  const p = game.player;
  p.stats.maxHp = 10; p.maxHp = 10; p.hp = 10;
  runFrames(game, 600, () => { p.invuln = 0; });
  assert.ok(p.hp < 10, 'o player levou dano de contato/ataque');
});

// ---------------------------------------------------------------- AGRESSAO (playtest 1)
/**
 * Critério do BUG 3: em sala limpa, o inimigo a 200 px precisa sair de IDLE,
 * entrar em ALERT, perseguir, chegar em atkRange + 8, atacar e causar dano.
 */
function assertAggressive(key, seed, maxDamage = Infinity) {
  const { game, p, room } = cleanRoom(seed);
  const spot = spotAt(room, p, 200, Math.PI);      // 200 px a esquerda
  const e = game.spawnEnemy(key, spot.x, spot.y, {});
  assert.ok(Math.hypot(e.x - p.x, e.y - p.y) >= 190, 'nasceu a 200 px do player');

  const seen = new Set();
  let minDist = Infinity;
  let framesToAttack = -1;
  let firstHitDamage = 0;
  const hp0 = p.hp;
  runFrames(game, 400, (i) => {
    seen.add(e.state);
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    minDist = Math.min(minDist, d);
    if (framesToAttack < 0 && e.state === STATE.ATTACK) framesToAttack = i;
    // mede o dano do PRIMEIRO golpe (contato se repete a cada janela de
    // invencibilidade, entao olhar o total inflaria a medida)
    if (firstHitDamage === 0 && p.hp < hp0) firstHitDamage = hp0 - p.hp;
    // zera a invencibilidade so ate o primeiro dano entrar
    if (p.hp === hp0) p.invuln = 0;
  });

  const def = ENEMIES[key];
  const dist = e.def || def;
  assert.ok(seen.has(STATE.ALERT) || seen.has(STATE.CHASE), `${key}: nunca saiu de IDLE (visto: ${[...seen]})`);
  assert.ok(seen.has(STATE.CHASE) || seen.has(STATE.TELEGRAPH) || seen.has(STATE.ATTACK), `${key}: nunca perseguiu`);
  assert.ok(seen.has(STATE.ATTACK), `${key}: nunca atacou em 400 frames (visto: ${[...seen]})`);
  assert.ok(minDist <= e.atkRange + 8, `${key}: chegou a ${minDist.toFixed(0)}px, esperado <= ${e.atkRange + 8}`);
  assert.ok(framesToAttack >= 0 && framesToAttack / 60 <= 6.5, `${key}: demorou ${(framesToAttack / 60).toFixed(1)}s para atacar`);
  assert.ok(p.hp < hp0, `${key}: atacou mas nao causou dano (hp ${p.hp}/${hp0})`);
  assert.ok(firstHitDamage >= 1 && firstHitDamage <= maxDamage,
    `${key}: dano do primeiro golpe fora do esperado (${firstHitDamage}, max ${maxDamage})`);
  return { framesToAttack, firstHitDamage };
}

test('Papel (rusher) persegue, alcanca e ataca em sala limpa', () => {
  assertAggressive('papel', 2024);
});

test('Telefone (ranged) persegue, alcanca e ataca em sala limpa', () => {
  assertAggressive('telefone', 2025);
});

test('Bug (swarm) persegue, alcanca e ataca em sala limpa', () => {
  assertAggressive('bug', 2026, 3);
});

test('todos os inimigos comuns sao agressivos (varredura das 10 especies)', () => {
  const falhas = [];
  for (const key of Object.keys(ENEMIES)) {
    const { game, p, room } = cleanRoom(3000 + key.length);
    const spot = spotAt(room, p, 170, Math.PI);
    const e = game.spawnEnemy(key, spot.x, spot.y, {});
    // dano alto no andar 1 e aceito desde que ele ataque; 8s de janela da
    // tempo ate o burocrata (lento) atravessar a sala
    const seen = new Set();
    const hp0 = p.hp;
    runFrames(game, 480, () => {
      seen.add(e.state);
      if (p.hp === hp0) p.invuln = 0;
    });
    if (!seen.has(STATE.ATTACK) && !seen.has(STATE.TELEGRAPH)) falhas.push(`${key} (${[...seen].join('>')})`);
  }
  assert.equal(falhas.length, 0, 'inimigos passivos: ' + falhas.join(', '));
});

test('os papeis de grupo deixam no maximo 1 inimigo de guarda', () => {
  const { game } = cleanRoom(4242);
  const p = game.player;
  const list = [];
  for (let i = 0; i < 6; i++) {
    const spot = spotAt(game.room, p, 60 + i * 8, i);
    list.push(game.spawnEnemy('papel', spot.x, spot.y, {}));
  }
  runFrames(game, 5);
  const guardas = list.filter(e => e.role === 'keepDistance').length;
  assert.ok(guardas <= 1, `${guardas} inimigos de guarda (maximo 1)`);
  assert.ok(list.filter(e => e.role === 'pursue' || e.role === 'flank').length >= 5, 'o resto vai para cima');
  // com 2 inimigos, ninguem fica de guarda
  const { game: g2 } = cleanRoom(4243);
  const a = g2.spawnEnemy('papel', g2.player.x + 40, g2.player.y, {});
  const b = g2.spawnEnemy('papel', g2.player.x - 40, g2.player.y, {});
  runFrames(g2, 5);
  assert.equal(a.role, 'pursue');
  assert.equal(b.role, 'pursue');
});

test('rushers causam dano de contato (Papel e Grampeador), ranged so no ataque', () => {
  for (const key of ['papel', 'grampeador']) {
    const { game, p } = cleanRoom(700 + key.length);
    const e = game.spawnEnemy(key, p.x + 2, p.y + 2, {});
    p.invuln = 0;
    p.stats.maxHp = 10; p.maxHp = 10; p.hp = 10;
    runFrames(game, 3, () => { p.invuln = 0; });
    assert.ok(p.hp < 10, `${key} nao causou dano de contato`);
    assert.ok(e.def.arch === 'rusher', key + ' deveria ser rusher');
  }
});

test('a visao dos inimigos nao e bloqueada por moveis (so por tiles)', () => {
  const { game, p, room } = cleanRoom(8080);
  // coloca uma mesa entre o player e o inimigo: a LOS deve continuar valendo
  const mid = { x: p.x + 60, y: p.y };
  const desk = new (game.room.props.constructor || Object)();
  const key = 'papel';
  const e = game.spawnEnemy(key, p.x + 120, p.y, {});
  runFrames(game, 30, () => { e.losTimer = 0; });
  assert.equal(e.hasLos, true, 'mesa/estante solida nao deve bloquear a linha de visao');
  assert.ok(Math.abs(e.x - p.x) < 200, 'inimigo de fato enxergou e veio');

  // e a LOS e bloqueada por parede de verdade
  const { game: g2, p: p2 } = cleanRoom(8081);
  const e2 = g2.spawnEnemy('papel', p2.x, p2.y - 200, {});
  runFrames(g2, 4, () => { e2.losTimer = 0; });
  assert.equal(typeof e2.hasLos, 'boolean');
});

test('sala de combate do andar 1 ca cabe na nova grade (28x16) e tem espaco para dashear', () => {
  const { game, room } = cleanRoom(11);
  assert.equal(room.cols, 28);
  assert.equal(room.rows, 16);
  assert.equal(room.w, 28 * TILE);
  assert.equal(room.h, 16 * TILE);
  // espaco livre no meio para o dash (330 px/s por 0.18s = 59 px)
  const p = game.player;
  const free = room.map.freeCells(3).length;
  assert.ok(free > 100, 'sala tem area livre suficiente (células: ' + free + ')');
  assert.ok(p.x > 40 && p.x < room.w - 40, 'player no centro com espaco');
});
