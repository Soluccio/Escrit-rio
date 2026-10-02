/**
 * systems.test.js — fisica, camera, save, progressao, hazards, itens e o
 * desempenho do render headless.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessGame, startRun, runFrames } from '../tools/headless.mjs';
import { Save, memoryStorage } from '../src/core/Save.js';
import { Camera } from '../src/core/Camera.js';
import { FX } from '../src/core/FX.js';
import { RNG } from '../src/core/RNG.js';
import { hasLOS, moveWithTiles, separate } from '../src/core/Physics.js';
import { TileMap } from '../src/world/TileMap.js';
import { Prop, PROP_DEFS } from '../src/world/Prop.js';
import { ITEMS, ITEM_IDS } from '../src/data/items.js';
import { T, TUNING, PLAYER } from '../src/data/constants.js';

test('colisao AABB bloqueia o movimento contra paredes', () => {
  const map = new TileMap(10, 10);
  map.buildBox('floor', null);
  const e = { x: 20, y: 20, w: 10, h: 10 };
  // tentar sair do mapa pela esquerda
  const hit = moveWithTiles(e, -100, 0, map);
  assert.ok(hit.x, 'colidiu no eixo X');
  assert.ok(e.x >= 16, 'nao atravessou a parede: x=' + e.x);
});

test('separacao suave empurra corpos sobrepostos', () => {
  const a = { x: 100, y: 100, radius: 8 };
  const b = { x: 100, y: 100, radius: 8 };
  for (let i = 0; i < 20; i++) separate([a, b], 0.5);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 4, 'se separaram');
});

test('line of sight e bloqueada por parede', () => {
  const map = new TileMap(12, 12);
  map.buildBox('floor', null);
  const inRoom = { x: 32, y: 32 };
  const sameRoom = { x: 100, y: 100 };
  assert.ok(hasLOS(inRoom, sameRoom, map), 'sem parede no meio = LOS');
  const outside = { x: -8, y: -8 };
  assert.equal(hasLOS(inRoom, outside, map), false, 'parede bloqueia LOS');
});

test('camera segue o player, respeita bounds e treme', () => {
  const cam = new Camera(480, 270);
  cam.setBounds(640, 480);
  cam.snap(320, 240);
  cam.update(1 / 60, 340, 240);
  assert.ok(cam.x >= 320 && cam.x <= 360, 'camera acompanhou: ' + cam.x);
  cam.addShake(6);
  cam.update(1 / 60, 340, 240);
  assert.ok(Math.abs(cam.shakeX) + Math.abs(cam.shakeY) > 0, 'shake aplicado');
  cam.update(2, 340, 240);
  assert.ok(Math.abs(cam.shakeX) + Math.abs(cam.shakeY) < 1, 'shake decaiu');
  // zoom de boss
  cam.targetZoom = 0.85;
  for (let i = 0; i < 120; i++) cam.update(1 / 60, 340, 240);
  assert.ok(Math.abs(cam.zoom - 0.85) < 0.01, 'zoom de boss aplicado: ' + cam.zoom);
});

test('FX: dano, hitstop, shake e limite de particulas', () => {
  const fx = new FX(new RNG(1));
  fx.burst(10, 10, 'paper', { count: 20 });
  assert.ok(fx.particles.filter(p => p.active).length === 20);
  for (let i = 0; i < 30; i++) fx.burst(10, 10, 'paper', { count: 20 });
  assert.ok(fx.particles.filter(p => p.active).length <= 120, 'nunca passa de 120');
  fx.hitStop(TUNING.hitstopHit);
  assert.ok(fx.frozen);
  fx.update(0.05);
  assert.equal(fx.frozen, false, 'hitstop expira');
  fx.damageNumber(0, 0, 12, 'crit');
  assert.equal(fx.numbers.filter(n => n.active).length, 1);
  fx.clear();
  assert.equal(fx.particles.filter(p => p.active).length, 0);
});

test('props destrutiveis quebram e soltam drop', () => {
  const map = new TileMap(20, 20);
  map.buildBox('floor', null);
  const prop = new Prop('printer', 100, 100);
  assert.ok(prop.destructible);
  const hp0 = prop.hp;
  prop.damage(3);
  assert.ok(prop.hp < hp0, 'levou dano');
  assert.ok(prop.damage(999), 'quebrou');
  assert.ok(prop.broken);
  assert.equal(prop.drops, 'toner');
  assert.ok(PROP_DEFS.desk.solid && PROP_DEFS.desk.destructible);
});

test('hazards causam dano no player e expiram', () => {
  const { game } = createHeadlessGame({ seed: 12 });
  startRun(game, 12, 'max');
  const p = game.player;
  p.stats.maxHp = 5; p.maxHp = 5; p.hp = 5;
  const h = game.spawnHazard('coffee', p.x, p.y, { radius: 20, damage: 1, life: 0.6 });
  p.invuln = 0;
  runFrames(game, 45, () => { p.invuln = 0; });
  assert.ok(p.hp < 5, 'levou dano do hazard');
  assert.ok(!game.hazards.list.includes(h), 'hazard expirou');
});

test('a maquina de cafe cura so uma vez por andar', () => {
  const { game } = createHeadlessGame({ seed: 5 });
  startRun(game, 5, 'max');
  const p = game.player;
  const room = game.floor.list.find(r => r.type === 'rest');
  assert.ok(room, 'andar tem sala de descanso');
  game.director.enterRoom(room, null, true);
  const coffee = room.interactables.find(i => i.kind === 'coffee');
  assert.ok(coffee, 'sala de descanso tem cafeteira');
  p.hp = 1;
  game.useInteractable(coffee);
  assert.equal(p.hp, p.maxHp, 'curou tudo');
  p.hp = 1;
  game.useInteractable(coffee);
  assert.equal(p.hp, 1, 'nao cura de novo');
});

test('bau de tesouro entrega recompensa e nao repete', () => {
  const { game } = createHeadlessGame({ seed: 31 });
  startRun(game, 31, 'max');
  const room = game.floor.list.find(r => r.type === 'treasure');
  assert.ok(room, 'andar tem tesouro');
  game.director.enterRoom(room, null, true);
  const chest = room.interactables.find(i => i.kind === 'chest');
  assert.ok(chest);
  game.useInteractable(chest);
  assert.ok(chest.used, 'bau marcado como usado');
  const coins0 = game.stats.coins;
  game.useInteractable(chest);
  assert.equal(game.stats.coins, coins0, 'nao da recompensa duas vezes');
});

test('itens ativos tem cooldown, tipo e props', () => {
  for (const id of ITEM_IDS) {
    const it = ITEMS[id];
    assert.ok(it.name && it.cooldown > 0 && it.kind, id + ' incompleto');
    assert.ok(it.desc, id + ' sem descricao');
  }
});

test('todos os itens ativos podem ser usados sem erro', () => {
  for (const id of ITEM_IDS) {
    const { game } = createHeadlessGame({ seed: 99 });
    startRun(game, 99, 'max');
    const p = game.player;
    p.activeItem = id;
    p.aimAngle = 0.4;
    p.useSecondary(game);
    const errs = runFrames(game, 30);
    assert.equal(errs.length, 0, id + ' gerou erro: ' + errs.map(e => e.error.message).join(','));
  }
});

test('moeda a cada 100 da coracao extra', () => {
  const { game } = createHeadlessGame({ seed: 7 });
  startRun(game, 7, 'max');
  const p = game.player;
  const max0 = p.maxHp;
  for (let i = 0; i < PLAYER.coinHeartEvery; i++) {
    game.spawnPickup('coin', p.x, p.y, {});
    game.pickups[game.pickups.length - 1].collect(game, p);
  }
  assert.equal(p.maxHp, max0 + 1, '+1 coracao com 100 moedas');
  assert.equal(game.stats.coins, 100);
});

test('save persiste progresso, selos e personagens', () => {
  const store = memoryStorage();
  const s1 = new Save(store);
  s1.markBlessing('oculos');
  s1.markBossKill('recepcionista');
  s1.finishRun({ won: true, floor: 6, time: 600, maxCombo: 9, coinsEarned: 120, minibossesKilled: 5, seals: 80 });
  const s2 = new Save(store);   // recarrega do "localStorage"
  assert.ok(s2.data.blessingsSeen.includes('oculos'));
  assert.ok(s2.data.bossesDefeated.includes('recepcionista'));
  assert.equal(s2.data.seals, 80);
  assert.equal(s2.data.bestTime, 600);
  assert.equal(s2.data.bestCombo, 9);
  // desbloqueio de personagem
  assert.ok(s2.unlockChar('bia', 20), 'Bia desbloqueada com 80 selos');
  assert.equal(s2.data.seals, 60);
  assert.ok(s2.data.unlockedChars.includes('bia'));
  assert.equal(s2.unlockChar('ze', 80), false, 'selos insuficientes para o Seu Ze');
  assert.equal(s2.data.seenSecret, false);
  s2.data.seenSecret = true;
  s2.save();
  assert.equal(new Save(store).data.seenSecret, true);
});

test('snapshot de run permite continuar com o mesmo predio', () => {
  const { game, storage } = createHeadlessGame({ seed: 2468 });
  startRun(game, 2468, 'max');
  const sig = g => g.floor.list.map(r => `${r.gx},${r.gy}:${r.type}`).sort().join('|');
  const before = sig(game);
  const seed = game.runSeed;
  const snap = game.loadRun();
  assert.ok(snap && snap.seed === seed, 'snapshot salvo');
  const { game: g2 } = createHeadlessGame({ seed: 1, storage });
  g2.save.data.runSnapshot = snap;
  g2.director.continueRun();
  assert.equal(sig(g2), before, 'predio reconstruido igual pela seed');
  assert.equal(g2.state, 'PLAY');
});

test('render headless roda dentro do orcamento de tempo (proxy de 60 FPS)', () => {
  const { game, input } = createHeadlessGame({ seed: 314 });
  startRun(game, 314, 'max');
  const room = game.floor.list.find(r => r.type === 'combat');
  game.director.enterRoom(room, null, true);
  const t0 = Date.now();
  const FRAMES = 240;
  runFrames(game, FRAMES, () => {
    input.move.x = 1; input.move.y = 0.3;
    input.hold('fire', true);
  });
  const ms = Date.now() - t0;
  const perFrame = ms / FRAMES;
  assert.ok(perFrame < 16.6, `render headless ${perFrame.toFixed(2)}ms/frame (limite 16.6ms)`);
});

test('o loop usa delta fixo de 1/60', () => {
  const { game } = createHeadlessGame({ seed: 1 });
  startRun(game, 1, 'max');
  game.loop.accumulator = 0;
  game.loop.advance(0.05);
  assert.ok(game.loop.steps >= 3, 'acumulador converteu 50ms em passos de 16.6ms');
  assert.equal(TUNING.fixedDt, 1 / 60);
});

test('gamepad e touch sao suportados pelo input', () => {
  const { game } = createHeadlessGame({ seed: 2 });
  // o jogo headless roda sem touch; o Input precisa oferecer a API completa
  const i = game.input;
  for (const fn of ['axis', 'aim', 'down', 'pressed', 'endFrame']) {
    assert.equal(typeof i[fn], 'function', 'Input.' + fn);
  }
});
