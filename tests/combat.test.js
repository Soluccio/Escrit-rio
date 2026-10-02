/**
 * combat.test.js — dano reduz HP, postura enche, execucao funciona,
 * morte limpa, combo e drops.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessGame, startRun, runFrames } from '../tools/headless.mjs';
import { TUNING, PLAYER } from '../src/data/constants.js';

function freshGame(seed = 1234) {
  const { game, input } = createHeadlessGame({ seed });
  startRun(game, seed, 'max');
  return { game, input };
}

test('dano reduz HP do inimigo e aplica flash + knockback', () => {
  const { game } = freshGame();
  const e = game.spawnEnemy('papel', game.player.x + 60, game.player.y, {});
  const before = e.hp;
  const res = game.combat.hitEnemy(e, 3, { fromX: game.player.x, fromY: game.player.y, noCrit: true });
  assert.equal(res.damage, 3);
  assert.equal(e.hp, before - 3);
  assert.ok(e.hitFlash > 0, 'flash branco aplicado');
  assert.ok(e.hitFlash <= TUNING.flashTime + 0.001);
  assert.ok(Math.abs(e.knockVX) + Math.abs(e.knockVY) > 0, 'levou knockback');
  assert.equal(e.state, 'HURT', 'FSM foi para HURT');
});

test('matar inimigo: dead, particulas, moedas e combo', () => {
  const { game } = freshGame();
  const e = game.spawnEnemy('bug', game.player.x + 40, game.player.y, {});
  const particlesBefore = game.fx.particles.filter(p => p.active).length;
  game.combat.hitEnemy(e, 999, { noCrit: true });
  assert.ok(e.dead, 'inimigo morreu');
  assert.ok(game.fx.particles.filter(p => p.active).length > particlesBefore, 'soltou particulas');
  assert.equal(game.stats.kills, 1);
  assert.equal(game.combat.combo, 1);
  assert.ok(game.pickups.some(p => p.kind === 'coin'), 'dropou moeda');
});

test('postura enche, fica executavel e a execucao causa dano alto', () => {
  const { game } = freshGame();
  const e = game.spawnEnemy('burocrata', game.player.x + 50, game.player.y, {});
  assert.ok(e.postureMax > 0);
  let guard = 0;
  while (!e.executable && guard++ < 100) {
    game.combat.hitEnemy(e, 0.4, { posture: 10, noCrit: true });
  }
  assert.ok(e.executable, 'ficou executavel ao encher a postura');
  const hpBefore = e.hp;
  const ok = game.combat.execute(e);
  assert.ok(ok, 'execucao aceita');
  assert.ok(e.hp < hpBefore, 'execucao causou dano');
});

test('execucao sem postura cheia e rejeitada', () => {
  const { game } = freshGame();
  const e = game.spawnEnemy('papel', game.player.x + 30, game.player.y, {});
  assert.equal(game.combat.execute(e), false);
});

test('dano no player respeita invencibilidade e chega a morte', () => {
  const { game } = freshGame();
  const p = game.player;
  p.stats.maxHp = 3; p.maxHp = 3; p.hp = 3;
  p.invuln = 0;   // ao entrar na sala o player ganha 0.5s de invencibilidade
  const hit1 = game.combat.hitPlayer(null, 1, {});
  assert.ok(hit1, 'primeiro dano aplicado');
  assert.equal(p.hp, 2);
  const hit2 = game.combat.hitPlayer(null, 1, {});
  assert.equal(hit2, false, 'invencivel logo apos levar dano');
  assert.equal(p.hp, 2);
  // passa a invencibilidade
  p.invuln = 0;
  game.combat.hitPlayer(null, 5, {});
  assert.ok(p.dead, 'player morreu');
});

test('projetil do player acerta inimigo e respeita pierce', () => {
  const { game } = freshGame();
  const p = game.player;
  const e = game.spawnEnemy('papel', p.x + 40, p.y, {});
  const hpBefore = e.hp;
  game.spawnProjectile({
    kind: 'clip', x: p.x + 10, y: e.y, angle: 0, speed: 300,
    damage: 2, from: 'player',
  });
  runFrames(game, 20, () => { /* sem input: projétil viaja sozinho */ });
  assert.ok(e.hp < hpBefore, 'projetil causou dano');
});

test('projetil com pierce atravessa e acerta varios', () => {
  const { game } = freshGame();
  const p = game.player;
  const e1 = game.spawnEnemy('papel', p.x + 40, p.y, {});
  const e2 = game.spawnEnemy('papel', p.x + 70, p.y, {});
  game.spawnProjectile({
    kind: 'clip', x: p.x + 10, y: p.y, angle: 0, speed: 400,
    damage: 2, from: 'player', pierce: 2,
  });
  runFrames(game, 20);
  assert.ok(e1.hp < e1.maxHp && e2.hp < e2.maxHp, 'os dois levaram dano');
});

test('bencao de dano aumenta o dano causado', () => {
  const { game } = freshGame();
  const p = game.player;
  const e1 = game.spawnEnemy('burocrata', p.x + 40, p.y, {});
  const d1 = game.combat.hitEnemy(e1, 10, { noCrit: true }).damage;
  p.stats.damage *= 2;
  const e2 = game.spawnEnemy('burocrata', p.x + 60, p.y, {});
  const d2 = game.combat.hitEnemy(e2, 10, { noCrit: true }).damage;
  assert.equal(d2, d1 * 2, 'dano dobrado pela bencao');
});

test('o numero de particulas fica dentro do limite de 120', () => {
  const { game } = freshGame();
  for (let i = 0; i < 40; i++) {
    const e = game.spawnEnemy('papel', game.player.x + 20 + (i % 5) * 8, game.player.y + (i % 7) * 8, {});
    game.combat.hitEnemy(e, 999, { noCrit: true });
  }
  const active = game.fx.particles.filter(p => p.active).length;
  assert.ok(active <= 120, `particulas ativas ${active} > 120`);
});

test('hitstop e freeze frame sao aplicados', () => {
  const { game } = freshGame();
  const e = game.spawnEnemy('papel', game.player.x + 30, game.player.y, {});
  game.combat.hitEnemy(e, 1, {});
  assert.ok(game.fx.hitstop > 0, 'hit stop no acerto');
  assert.ok(game.fx.frozen, 'simulacao congelada no instante do acerto');
});
