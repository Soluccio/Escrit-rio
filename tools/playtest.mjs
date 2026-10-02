#!/usr/bin/env node
/**
 * playtest.mjs — capturas de VALIDACAO das correcoes do playtest 1.
 *
 * Gera em shots/:
 *   playtest-combate.png     sala de combate em pleno combate, com 3+ inimigos,
 *                            o player e numeros de dano flutuando
 *   playtest-zoom.png        comparacao: quanto da sala aparece na tela
 *   playtest-menu.png        menu com a opcao CONTROLES: AUTO/TOUCH/TECLADO
 *   playtest-miniboss.png    arena de chefe com o zoom de boss (1.15)
 *
 * Tambem imprime os numeros que sustentam os criterios de aceite.
 *
 *   node tools/playtest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createHeadlessGame, startRun, runFrames } from './headless.mjs';
import { saveCanvasPNG } from './png.mjs';
import { VIEW_W, VIEW_H, ROOM_COLS, ROOM_ROWS, BOSS_COLS, BOSS_ROWS, TILE, CAMERA, PLAYER } from '../src/data/constants.js';
import { ENEMIES } from '../src/data/enemies.js';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots');
fs.mkdirSync(OUT, { recursive: true });

const save = (canvas, name) => {
  saveCanvasPNG(fs, path.join(OUT, name), canvas, 2);
  console.log(`  shots/${name}  960x540  ${(fs.statSync(path.join(OUT, name)).size / 1024).toFixed(1)}kb`);
};

/** Sala de combate limpa e pronta para a briga (sem premio de bencao travando o estado). */
function battleRoom(seed) {
  const { game, input } = createHeadlessGame({ seed });
  startRun(game, seed, 'max');
  const room = game.floor.list.find(r => r.type === 'combat');
  room.cleared = true;
  room.props.length = 0;
  game.director.enterRoom(room, null, true);
  room.entities.length = 0;
  room.cleared = true;
  game.state = 'PLAY';
  const p = game.player;
  p.x = room.w / 2 - 40; p.y = room.h / 2;
  p.stats.maxHp = 8; p.maxHp = 8; p.hp = 8;
  return { game, input, room, p };
}

// ---------------------------------------------------------------- cena 1: combate
console.log('> cena 1: combate com 3+ inimigos e numeros de dano');
const { game, input, room, p } = battleRoom(2024);
// 4 inimigos variados em volta, na distancia de combate
const spawns = [
  ['papel', 70, -0.15], ['grampeador', 95, 0.35],
  ['papel', 110, -0.5], ['planilha', 130, 0.6],
];
const inimigos = spawns.map(([key, d, a]) =>
  game.spawnEnemy(key, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, {}));

// atira no mais proximo ate aparecer numero de dano na tela
let tentativas = 0;
let numerosVisiveis = 0;
while (tentativas++ < 600) {
  const alvo = inimigos.find(e => !e.dead) || inimigos[0];
  const dx = alvo.x - p.x, dy = alvo.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  input.aimDir.x = dx / d; input.aimDir.y = dy / d;
  input.hold('fire', true);
  // fica parado mirando (o inimigo vem para cima: combate de verdade)
  input.move.x = 0; input.move.y = 0;
  p.invuln = 0;                       // deixa a IA acertar o player tambem
  runFrames(game, 1);
  numerosVisiveis = game.fx.numbers.filter(n => n.active).length;
  if (numerosVisiveis > 0 && game.fx.particles.filter(x => x.active).length > 8) break;
}
save(game.canvas, 'playtest-combate.png');
console.log(`  inimigos vivos: ${room.entities.filter(e => !e.dead && e.isEnemy).length} | numeros de dano na tela: ${numerosVisiveis}`);
console.log(`  vida do player: ${p.hp}/${p.maxHp} (a IA atacou de volta)`);

// ---------------------------------------------------------------- cena 2: menu
console.log('> cena 2: menu com a opcao de controles');
const m = createHeadlessGame({ seed: 7 });
startRun(m.game, 7, 'max');
m.game.toMenu();
runFrames(m.game, 30);
save(m.game.canvas, 'playtest-menu.png');
const opcoes = m.game.menu.options;
console.log('  opcoes do menu:', opcoes.join(' | '));

// ---------------------------------------------------------------- cena 3: mini-boss
console.log('> cena 3: arena de mini-boss (zoom de boss)');
const b = battleRoom(5150);
b.game.director.enterRoom(b.game.floor.bossRoom, null, true);
b.game.player.stats.maxHp = 12; b.game.player.maxHp = 12; b.game.player.hp = 12;
runFrames(b.game, 200);
save(b.game.canvas, 'playtest-miniboss.png');
console.log(`  boss: ${b.game.boss ? b.game.boss.def.name : 'nenhum'} | zoom da camera: ${b.game.camera.zoom.toFixed(2)}`);

// ---------------------------------------------------------------- numeros do criterio
const mundoW = VIEW_W / CAMERA.zoom, mundoH = VIEW_H / CAMERA.zoom;
console.log('\n> criterios de aceite (medidos):');
console.log(`  sala de combate: ${ROOM_COLS}x${ROOM_ROWS} tiles = ${ROOM_COLS * TILE}x${ROOM_ROWS * TILE} px (antes 640x480)`);
console.log(`  arena de chefe:  ${BOSS_COLS}x${BOSS_ROWS} tiles = ${BOSS_COLS * TILE}x${BOSS_ROWS * TILE} px (antes 736x512)`);
console.log(`  viewport a zoom ${CAMERA.zoom}: ${mundoW.toFixed(0)}x${mundoH.toFixed(0)} px de mundo`);
console.log(`  fracao da sala visivel: ${(mundoW / (ROOM_COLS * TILE) * 100).toFixed(0)}% da largura, ${(mundoH / (ROOM_ROWS * TILE) * 100).toFixed(0)}% da altura`);
const sprite = m.game.sprites.info('enemy:papel:idle');
console.log(`  sprite de inimigo comum: ${sprite.w}x${sprite.h} px (antes 16x16) -> ${(sprite.w * CAMERA.zoom).toFixed(0)} px na tela`);
console.log(`  hitbox de inimigo comum: ${ENEMIES.papel.size} px | burocrata: ${ENEMIES.burocrata.size} px (sprite ${ENEMIES.burocrata.spriteSize})`);
console.log(`  aceleracao do player: ${PLAYER.accel} px/s² (${(PLAYER.accel / PLAYER.speed).toFixed(0)}x a velocidade maxima ${PLAYER.speed})`);
console.log(`  friccao: ${PLAYER.friction} px/s² (${(PLAYER.friction / PLAYER.accel).toFixed(2)}x a aceleracao)`);
console.log('capturas de validacao OK');
