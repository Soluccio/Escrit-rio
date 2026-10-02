/**
 * movement.test.js — resposta do player (playtest 1, BUG 1).
 *
 * Critério: "apertar D por 10 frames, soltar por 10 frames" — o player precisa
 * atingir > 85% da velocidade maxima em <= 0.15s e parar em <= 0.12s.
 * Sensacao alvo: colado no input — aperta, anda; solta, para. Sem "gelo".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessGame, startRun, runFrames } from '../tools/headless.mjs';
import { PLAYER } from '../src/data/constants.js';

/** Sala vazia e sem moveis: mede so o movimento. */
function emptyRoom(seed = 5) {
  const { game, input } = createHeadlessGame({ seed });
  startRun(game, seed, 'max');
  const room = game.floor.list.find(r => r.type === 'combat');
  // sala marcada como limpa: sem premio de bencao, o estado fica em PLAY e a
  // medicao de movimento nao para no meio
  room.cleared = true;
  room.props.length = 0;
  game.director.enterRoom(room, null, true);
  room.entities.length = 0;
  room.cleared = true;
  game.state = 'PLAY';
  const p = game.player;
  p.x = room.w / 2; p.y = room.h / 2;
  p.vx = 0; p.vy = 0;
  p.invuln = 999;               // nada de dano atrapalhando a medida
  return { game, input, p, room };
}

test('movimentacao responsiva sem lag de resposta', () => {
  const { game, input, p } = emptyRoom();
  const maxSp = p.stats.speed;
  const dt = 1 / 60;

  // --- acelera: 10 frames segurando "D" (direita)
  input.move.x = 1; input.move.y = 0;
  let framesTo85 = -1;
  for (let f = 1; f <= 10; f++) {
    runFrames(game, 1);
    const sp = Math.hypot(p.vx, p.vy);
    if (framesTo85 < 0 && sp >= maxSp * 0.85) framesTo85 = f;
  }
  const t85 = framesTo85 * dt;
  assert.ok(framesTo85 > 0, 'o player nao acelerou com o input apertado');
  assert.ok(t85 <= 0.15, `levou ${t85.toFixed(3)}s para chegar a 85% da velocidade maxima (limite 0.15s)`);
  assert.ok(p.vx > 0, 'andou para a direita como pedido');

  // --- freia: 10 frames com a tecla solta
  input.move.x = 0; input.move.y = 0;
  let framesToStop = -1;
  for (let f = 1; f <= 10; f++) {
    runFrames(game, 1);
    if (Math.hypot(p.vx, p.vy) === 0 && framesToStop < 0) framesToStop = f;
  }
  const tStop = framesToStop * dt;
  assert.ok(framesToStop > 0, 'o player continuou escorregando depois de soltar (nunca parou)');
  assert.ok(tStop <= 0.12, `levou ${tStop.toFixed(3)}s para parar (limite 0.12s)`);
});

test('o player nao anda sozinho com o input solto (sem inercia fantasma)', () => {
  const { game, input, p } = emptyRoom(7);
  input.move.x = 1;
  runFrames(game, 30);
  const speedWhileHeld = Math.hypot(p.vx, p.vy);
  input.move.x = 0;
  runFrames(game, 15);
  assert.equal(Math.hypot(p.vx, p.vy), 0, 'parou de vez apos soltar');
  assert.ok(speedWhileHeld > 60, 'estava andando de verdade antes de soltar');
  // e continua parado nos frames seguintes
  runFrames(game, 30);
  assert.equal(Math.hypot(p.vx, p.vy), 0, 'segue parado sem input');
});

test('trocar de direcao nao trava (resposta de inversao)', () => {
  const { game, input, p } = emptyRoom(11);
  input.move.x = 1;
  runFrames(game, 20);
  assert.ok(p.vx > 0, 'indo para a direita');
  input.move.x = -1;
  let framesToReverse = -1;
  for (let f = 1; f <= 12; f++) {
    runFrames(game, 1);
    if (p.vx < 0 && framesToReverse < 0) framesToReverse = f;
  }
  assert.ok(framesToReverse > 0, 'nao inverteu o sentido');
  assert.ok(framesToReverse <= 9, `levou ${(framesToReverse / 60).toFixed(3)}s para inverter (esperado <= 0.15s)`);
});

test('a aceleracao configurada e 15-20x a velocidade maxima (responsiva)', () => {
  assert.ok(PLAYER.accel >= PLAYER.speed * 15 && PLAYER.accel <= PLAYER.speed * 20,
    `accel ${PLAYER.accel} fora da faixa ${PLAYER.speed * 15}-${PLAYER.speed * 20} px/s²`);
  assert.ok(PLAYER.friction >= PLAYER.accel * 1.1 && PLAYER.friction <= PLAYER.accel * 1.4,
    `friction ${PLAYER.friction} nao esta ~1.2x a aceleracao (${PLAYER.accel})`);
});

test('o dash continua funcionando com a direcao guardada (coyote so para o dash)', () => {
  const { game, input, p } = emptyRoom(13);
  input.move.x = 1; input.move.y = 0;
  runFrames(game, 6);
  input.move.x = 0; input.move.y = 0;
  runFrames(game, 2);
  input.press('dash');
  runFrames(game, 1);
  assert.ok(p.dashing, 'dash disparou logo apos soltar a tecla (usa a ultima direcao)');
  assert.ok(p.dashDir.x > 0.9, 'dash foi na direcao que estava andando');
});
