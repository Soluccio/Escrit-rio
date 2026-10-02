/**
 * aim.test.mjs — mira do mouse (twin-stick) e regressoes.
 *
 * O bug: `Input.aim()` devolvia a mira relativa ao movimento (`source: 'rel'`)
 * enquanto o ultimo dispositivo fosse o teclado — e `lastInputDevice` so virava
 * 'mouse' no CLIQUE, nunca no `mousemove`. Resultado: os clipes saiam na direcao
 * em que o sprite estava virado (ultima direcao de movimento), nao no cursor.
 *
 * Aqui ficam:
 *   1. aiming basico sem zoom
 *   2. aiming com zoom 1.4 (regressao do bug do zoom)
 *   3. mira independente do facing (atira para a direita andando para a esquerda)
 *   4. mouse parado nao reseta o aim
 *   5. nenhum pointer lock
 *   + o Input real (com DOM falso) provando que o mouse assume a mira no move
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createHeadlessGame, startRun, runFrames } from '../tools/headless.mjs';
import { installDOM } from '../tools/domstub.mjs';
import { Input } from '../src/core/Input.js';
import { VIEW_W, VIEW_H, CAMERA } from '../src/data/constants.js';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const EPS = 1e-6;

/** Angulo esperado a partir da formula de referencia (screen -> world -> angulo). */
function expectedAngle({ px, py, camX, camY, zoom, sx, sy }) {
  const wx = (sx - VIEW_W / 2) / zoom + camX;
  const wy = (sy - VIEW_H / 2) / zoom + camY;
  return Math.atan2(wy - py, wx - px);
}

/** Player parado numa sala vazia, com camera/zoom controlados. */
function scene({ px = 240, py = 135, camX = 240, camY = 135, zoom = 1 } = {}) {
  const { game, input } = createHeadlessGame({ seed: 30 });
  startRun(game, 30, 'max');
  const room = game.floor.list.find(r => r.type === 'combat');
  room.cleared = true;
  room.props.length = 0;
  game.director.enterRoom(room, null, true);
  room.entities.length = 0;
  room.props.length = 0;
  room.cleared = true;
  game.state = 'PLAY';
  const p = game.player;
  p.x = px; p.y = py;
  p.vx = 0; p.vy = 0;
  p.invuln = 999;
  const cam = game.camera;
  cam.zoom = zoom; cam.targetZoom = zoom;
  cam.x = camX; cam.y = camY;
  cam.shakeX = 0; cam.shakeY = 0;
  return { game, input, p, cam, room };
}

/** Mira com o mouse em coordenadas de tela, aplicando um frame de updateAim. */
function aimAt(s, sx, sy) {
  s.input.setMouse(sx, sy);
  s.p.updateAim(s.input, s.cam);
  return s.p.aimAngle;
}

// ============================================================== 1) SEM ZOOM
test('1. aiming basico sem zoom: o angulo segue o cursor', () => {
  // cenario do enunciado: player no centro da tela (x,y == camera)
  const s = scene({ px: 240, py: 135, camX: 240, camY: 135, zoom: 1 });
  const casos = [
    { sx: 400, sy: 135, esperado: 0, nome: 'direita' },
    { sx: 240, sy: 30, esperado: -Math.PI / 2, nome: 'cima' },
    { sx: 80, sy: 135, esperado: Math.PI, nome: 'esquerda' },
    { sx: 240, sy: 240, esperado: Math.PI / 2, nome: 'baixo' },
  ];
  for (const c of casos) {
    const ang = aimAt(s, c.sx, c.sy);
    assert.ok(Math.abs(ang - c.esperado) < 1e-3,
      `${c.nome}: angulo ${ang.toFixed(4)} != ${c.esperado.toFixed(4)}`);
  }
});

test('1b. aiming sem zoom com o player fora do centro da camera', () => {
  const s = scene({ px: 300, py: 180, camX: 240, camY: 135, zoom: 1 });
  for (const [sx, sy] of [[400, 135], [100, 60], [260, 250], [420, 240]]) {
    const ang = aimAt(s, sx, sy);
    const esperado = expectedAngle({ px: 300, py: 180, camX: 240, camY: 135, zoom: 1, sx, sy });
    assert.ok(Math.abs(ang - esperado) < 1e-3,
      `cursor (${sx},${sy}): ${ang.toFixed(4)} != ${esperado.toFixed(4)}`);
  }
});

// ============================================================== 2) COM ZOOM
test('2. aiming com zoom 1.4: mesma direcao (regressao do bug do zoom)', () => {
  // Player e camera alinhados: o cursor na horizontal/vertical da o MESMO angulo
  // em qualquer zoom (a divisao por zoom nao pode alterar a direcao).
  for (const zoom of [1, 1.4, CAMERA.zoom, CAMERA.zoomBoss]) {
    const s = scene({ px: 240, py: 135, camX: 240, camY: 135, zoom });
    assert.ok(Math.abs(aimAt(s, 400, 135) - 0) < 1e-3, `zoom ${zoom}: direita != 0`);
    assert.ok(Math.abs(aimAt(s, 240, 30) + Math.PI / 2) < 1e-3, `zoom ${zoom}: cima != -pi/2`);
    assert.ok(Math.abs(aimAt(s, 80, 135) - Math.PI) < 1e-3, `zoom ${zoom}: esquerda != pi`);
    assert.ok(Math.abs(aimAt(s, 240, 240) - Math.PI / 2) < 1e-3, `zoom ${zoom}: baixo != pi/2`);
  }
});

test('2b. sem dividir pelo zoom este teste falha (player fora do centro)', () => {
  // Aqui a divisao pelo zoom MUDA o angulo: o mundo sob o cursor fica mais perto
  // do centro da camera. Se alguem esquecer o `/ cam.zoom`, o zoom 1.4 devolve o
  // angulo do zoom 1 e a comparacao abaixo quebra.
  const px = 300, py = 180, camX = 240, camY = 135, sx = 430, sy = 70;
  const s1 = scene({ px, py, camX, camY, zoom: 1 });
  const s14 = scene({ px, py, camX, camY, zoom: 1.4 });
  const a1 = aimAt(s1, sx, sy);
  const a14 = aimAt(s14, sx, sy);

  const esperado1 = expectedAngle({ px, py, camX, camY, zoom: 1, sx, sy });
  const esperado14 = expectedAngle({ px, py, camX, camY, zoom: 1.4, sx, sy });
  assert.ok(Math.abs(a1 - esperado1) < 1e-3, `zoom 1: ${a1.toFixed(4)} != ${esperado1.toFixed(4)}`);
  assert.ok(Math.abs(a14 - esperado14) < 1e-3, `zoom 1.4: ${a14.toFixed(4)} != ${esperado14.toFixed(4)}`);
  // e o zoom 1.4 nao pode devolver o resultado do zoom 1 (sintoma do /zoom faltando)
  assert.ok(Math.abs(a14 - a1) > 0.05,
    `zoom 1.4 (${a14.toFixed(4)}) igual ao zoom 1 (${a1.toFixed(4)}): falta dividir pelo zoom`);

  // comparacao direta com a formula "errada" (sem /zoom) so para documentar
  const semZoom = expectedAngle({ px, py, camX, camY, zoom: 1, sx, sy });
  assert.ok(Math.abs(a14 - semZoom) > 0.05, 'o resultado com zoom 1.4 corresponde ao calculo sem /zoom');
});

test('2c. a mira com zoom aponta para o ponto de MUNDO sob o cursor', () => {
  const s = scene({ px: 320, py: 90, camX: 240, camY: 135, zoom: 1.4 });
  const alvoMundo = { x: 400, y: 150 };            // ponto de mundo desejado
  // descobre o pixel de tela que corresponde a esse ponto de mundo
  const sx = (alvoMundo.x - 240) * 1.4 + VIEW_W / 2;
  const sy = (alvoMundo.y - 135) * 1.4 + VIEW_H / 2;
  const ang = aimAt(s, sx, sy);
  const esperado = Math.atan2(alvoMundo.y - 90, alvoMundo.x - 320);   // player em (320, 90)
  assert.ok(Math.abs(ang - esperado) < 1e-3, `${ang.toFixed(4)} != ${esperado.toFixed(4)}`);
});

// ================================================= 3) INDEPENDENTE DO FACING
test('3. mira independente do facing: anda para a esquerda, atira para a direita', () => {
  const s = scene({ px: 200, py: 120, camX: 224, camY: 128, zoom: CAMERA.zoom });
  const { game, input, p } = s;

  // anda para a esquerda por 20 frames (o sprite vira para a esquerda)
  input.move.x = -1; input.move.y = 0;
  runFrames(game, 20);
  assert.equal(p.facing, -1, 'sprite virado para a esquerda enquanto anda para a esquerda');

  // mouse aponta para a direita (fora do canto direito da tela)
  const alvo = { x: VIEW_W - 40, y: VIEW_H / 2 };
  input.setMouse(alvo.x, alvo.y);
  runFrames(game, 1);

  assert.equal(p.facing, -1, 'facing continua -1 (andando para a esquerda)');
  assert.ok(Math.abs(p.aimAngle) < 0.35, `aimAngle ${p.aimAngle.toFixed(3)} deveria apontar para a direita (~0)`);

  // atira: o projetil precisa sair para a DIREITA (vx > 0), nao para o lado do sprite
  p.fireCooldown = 0;
  p.fire(game);
  const proj = game.projectiles.activeList[game.projectiles.activeList.length - 1];
  assert.ok(proj, 'projetil criado');
  assert.ok(proj.vx > 0, `projetil com vx ${proj.vx.toFixed(1)} (esperado > 0, ignorando o facing = ${p.facing})`);
  assert.ok(Math.abs(proj.vy) < Math.abs(proj.vx), 'tiro predominantemente horizontal');
});

test('3b. item secundario tambem usa o aimAngle (nunca o facing)', () => {
  const s = scene({ px: 200, py: 120, camX: 224, camY: 128, zoom: CAMERA.zoom });
  const { game, input, p } = s;
  input.move.x = -1;
  runFrames(game, 15);
  input.setMouse(VIEW_W - 30, VIEW_H / 2);
  runFrames(game, 1);
  assert.equal(p.facing, -1, 'sprite virado para a esquerda');

  // granada de grampos (shotgun) atira varios projeteis: todos para a direita
  p.activeItem = 'grampeador';
  p.secondaryCooldown = 0;
  p.useSecondary(game);
  const novos = game.projectiles.activeList.filter(x => x.from === 'player');
  assert.ok(novos.length > 0, 'item secundario gerou projeteis');
  for (const proj of novos) {
    assert.ok(proj.vx > 0, `projetil do item com vx ${proj.vx.toFixed(1)} (esperado > 0)`);
  }
});

// ==================================================== 4) MOUSE PARADO
test('4. mouse parado nao reseta o aim (nem volta para a direcao do movimento)', () => {
  const s = scene({ px: 224, py: 128, camX: 224, camY: 128, zoom: CAMERA.zoom });
  const { game, input, p } = s;

  // cursor logo acima do player: o angulo geometrico e -pi/2
  const acima = { x: VIEW_W / 2, y: VIEW_H / 2 - 60 };
  input.setMouse(acima.x, acima.y);
  runFrames(game, 1);
  const alvo = p.aimAngle;
  assert.ok(Math.abs(alvo + Math.PI / 2) < 1e-2, `mira inicial ${alvo.toFixed(3)} deveria ser -pi/2`);

  // 30 frames SEM mexer no mouse e SEM andar: nada pode mudar
  runFrames(game, 30);
  assert.ok(Math.abs(p.aimAngle - alvo) < 1e-3, `aimAngle mudou com o mouse parado (${p.aimAngle.toFixed(3)})`);
  assert.ok(Math.abs(p.aimAngle + Math.PI / 2) < 1e-2, 'mira continua em cima');

  // e o caso que era o bug: andando (WASD) a mira do mouse NAO pode ser trocada
  input.move.x = 1; input.move.y = 0;      // andando para a direita
  for (let i = 0; i < 30; i++) {
    // invariante: a mira aponta SEMPRE para o ponto de mundo sob o cursor —
    // inclusive enquanto o player anda e a camera se move. O updateAim roda
    // antes do update da camera dentro do frame, entao o esperado e calculado
    // com o estado atual de camera/player, antes de avancar o frame.
    const w = game.camera.screenToWorld(acima.x, acima.y);
    const esperado = Math.atan2(w.y - p.y, w.x - p.x);
    runFrames(game, 1);
    assert.ok(Math.abs(p.aimAngle - esperado) < 1e-3,
      `frame ${i}: mira ${p.aimAngle.toFixed(4)} != cursor ${esperado.toFixed(4)}`);
    // e nunca cai para a direcao do movimento (~0 = o bug antigo)
    assert.ok(Math.abs(p.aimAngle) > 1.0,
      `frame ${i}: a mira foi roubada pelo movimento (${p.aimAngle.toFixed(3)} ~ 0)`);
  }
  assert.equal(p.facing, 1, 'andando para a direita o sprite vira para a direita');
  // ...mas o tiro continua para CIMA, onde o cursor esta
  p.fireCooldown = 0;
  p.fire(game);
  const proj = game.projectiles.activeList[game.projectiles.activeList.length - 1];
  assert.ok(proj.vy < 0 && Math.abs(proj.vy) > Math.abs(proj.vx), 'o tiro segue o cursor (para cima)');
});

// ==================================================== 5) SEM POINTER LOCK
test('5. sem pointer lock: o cursor continua visivel para mirar', () => {
  const dom = installDOM();
  const canvas = dom.get('game');
  canvas.width = VIEW_W; canvas.height = VIEW_H;
  assert.equal(dom.document.pointerLockElement ?? null, null, 'nenhum elemento preso no pointer lock');
  // e nenhum arquivo do jogo pede pointer lock (top-down twin-stick nao combina)
  const arquivos = [];
  const varre = dir => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) varre(full);
      else if (f.name.endsWith('.js')) arquivos.push(full);
    }
  };
  varre(path.join(ROOT, 'src'));
  const culpados = arquivos.filter(f => /requestPointerLock|pointerlock/i.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(culpados, [], 'arquivos com pointer lock: ' + culpados.join(', '));
});

// ================================ O INPUT REAL: o mouse assume a mira no MOVER
test('o mousemove (sem clique) assume a mira; WASD nao rouba mais o tiro', () => {
  const dom = installDOM();
  const canvas = dom.get('game');
  canvas.width = VIEW_W; canvas.height = VIEW_H;
  const nav = { maxTouchPoints: 0, getGamepads: () => [null], userAgent: 'node' };
  Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true });
  const input = new Input(canvas, null);

  // 1. ninguem tocou no mouse ainda e o teclado esta andando: mira relativa
  dom.document.dispatch('keydown', { code: 'KeyA' });
  let aim = input.aim();
  assert.equal(aim.source, 'rel', 'teclado puro usa a mira relativa ao movimento');

  // 2. move o mouse (SEM clicar): a mira passa a ser do mouse
  canvas.dispatch('mousemove', { clientX: 460, clientY: 135 });
  assert.equal(input.mouse.hasMoved, true, 'mousemove marca hasMoved');
  assert.equal(input.lastInputDevice, 'mouse', 'mousemove assume o ultimo dispositivo');
  aim = input.aim();
  assert.equal(aim.source, 'mouse', 'a mira agora e do mouse');
  assert.ok(aim.x > 400, 'x convertido para o backbuffer: ' + aim.x);

  // 3. mesmo andando (teclado), a mira continua sendo o mouse
  dom.document.dispatch('keydown', { code: 'KeyD' });
  assert.equal(input.aim().source, 'mouse', 'WASD nao rouba a mira do mouse');

  // 4. a conversao de tela respeita o tamanho do canvas na pagina
  canvas.getBoundingClientRect = () => ({ left: 100, top: 50, width: 960, height: 540, right: 1060, bottom: 590 });
  canvas.dispatch('mousemove', { clientX: 100 + 480, clientY: 50 + 270 });
  assert.ok(Math.abs(input.mouse.x - 240) < 1e-6 && Math.abs(input.mouse.y - 135) < 1e-6,
    `conversao errada: ${input.mouse.x}, ${input.mouse.y}`);

  // 5. gamepad ainda tem prioridade quando o stick direito esta ativo
  input.pad = { axes: [0, 0, 1, 0], buttons: [] };
  input.aimStick = { x: 1, y: 0 };
  assert.equal(input.aim().source, 'pad', 'stick direito do gamepad volta a mandar');
});

test('o cursor do canvas e crosshair (feedback visual da mira)', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /canvas#game\s*\{[^}]*cursor:\s*crosshair/, 'falta cursor: crosshair no canvas');
});
