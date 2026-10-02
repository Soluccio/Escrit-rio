#!/usr/bin/env node
/**
 * screenshot.mjs — renderiza 1 frame do jogo no Node (headless) e salva PNG.
 * Otimo para inspecionar o pixel art sem abrir o navegador.
 *
 *   node tools/screenshot.mjs                      -> cenas padrao em shots/
 *   node tools/screenshot.mjs --floor 3 --frames 600 --out shots/andar3.png
 *   node tools/screenshot.mjs --boss gerente       -> leva o player ate o chefe
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHeadlessGame, startRun, runFrames } from './headless.mjs';
import { encodePNG } from './png.mjs';
import { generateFloor } from '../src/world/RoomGenerator.js';

const args = process.argv.slice(2);
const arg = (name, def = null) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : def;
};
const outDir = arg('out-dir', 'shots');
fs.mkdirSync(outDir, { recursive: true });

function save(canvas, file, scale = 2) {
  const buf = encodePNG(canvas.pixels, canvas.width, canvas.height, scale);
  fs.writeFileSync(file, buf);
  console.log(`  ${file}  ${canvas.width * scale}x${canvas.height * scale}  ${(buf.length / 1024).toFixed(1)}kb`);
}

/** Avanca frames com um bot simples que anda/mira/atira. */
function playFrames(game, input, frames, opts = {}) {
  return runFrames(game, frames, (i, g) => {
    // descarta as cartas de bencao para o print nao sair com o menu aberto
    if (g.state === 'BLESSING' || g.state === 'SHOP' || g.state === 'PAUSE') { input.press('confirm'); return; }
    if (g.state !== 'PLAY') return;
    const room = g.room;
    const p = g.player;
    const targets = room.entities.filter(e => !e.dead && e.isEnemy);
    const enemy = targets[0];
    if (enemy) {
      const dx = enemy.x - p.x, dy = enemy.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      input.aimDir.x = dx / d; input.aimDir.y = dy / d;
      input.move.x = d > (enemy.isBoss ? 70 : 36) ? dx / d : -dx / d;
      input.move.y = d > (enemy.isBoss ? 70 : 36) ? dy / d : -dy / d;
      input.hold('fire', true);
      if (i % 80 === 0) input.press('dash');
      if (i % 130 === 0) input.press('secondary');
    } else if (opts.wander !== false) {
      input.hold('fire', false);
      const t = room.center;
      const dx = t.x - p.x + Math.sin(i / 40) * 40, dy = t.y - p.y + Math.cos(i / 55) * 30;
      const d = Math.hypot(dx, dy) || 1;
      input.move.x = dx / d; input.move.y = dy / d;
      input.aimDir.x = dx / d; input.aimDir.y = dy / d;
    }
  });
}

const errorsAll = [];

// ---------------------------------------------------------------- cena 1: menu
{
  const { game } = createHeadlessGame({ seed: 7 });
  game.save.data.runs = 3;
  game.save.data.blessingsSeen = ['oculos', 'grampo', 'pendrive'];
  game.save.data.seals = 45;
  runFrames(game, 30);
  save(game.canvas, path.join(outDir, 'cena-menu.png'), 2);
}

// ---------------------------------------------------------------- cena 2: combate
{
  const { game, input } = createHeadlessGame({ seed: 2024 });
  startRun(game, 2024, 'max');
  // pula direto para uma sala de combate com inimigos
  const fightRoom = game.floor.list.find(r => r.type === 'combat');
  game.director.enterRoom(fightRoom, null, true);
  playFrames(game, input, 90);
  save(game.canvas, path.join(outDir, 'cena-combate.png'), 2);
  game.player.stats.maxHp = 8; game.player.maxHp = 8; game.player.hp = 8;
  playFrames(game, input, 120);
  game.director.offerBlessing('SALA LIMPA');
  runFrames(game, 30);
  save(game.canvas, path.join(outDir, 'cena-combate-limpo.png'), 2);
  game.blessingPicker.pick(0, game);
  errorsAll.push(...playFrames(game, input, 300).map(e => 'combate: ' + e.error.message));
}

// ---------------------------------------------------------------- cena 3: mini-boss
{
  const { game, input } = createHeadlessGame({ seed: 5150 });
  startRun(game, 5150, 'max');
  game.player.stats.clipDamage = 40;
  game.player.stats.maxHp = 12; game.player.maxHp = 12; game.player.hp = 12;
  game.director.enterRoom(game.floor.bossRoom, null, true);
  playFrames(game, input, 150);
  save(game.canvas, path.join(outDir, 'cena-miniboss.png'), 2);
  errorsAll.push(...playFrames(game, input, 900).map(e => 'miniboss: ' + e.error.message));
}

// ---------------------------------------------------------------- cena 4: andares variados
for (const floorN of [2, 4, 6]) {
  const { game, input } = createHeadlessGame({ seed: 31337 });
  startRun(game, 31337, 'max');
  game.floorN = floorN;
  game.floorData = (await import('../src/data/constants.js')).FLOORS[floorN - 1];
  game.floorScale = (await import('../src/data/constants.js')).floorScale(floorN);
  game.floor = generateFloor(floorN, 999);
  const room = game.floor.list.find(r => r.type === 'combat') || game.floor.start;
  game.director.enterRoom(room, null, true);
  game.player.stats.clipDamage = 30;
  playFrames(game, input, 300);
  save(game.canvas, path.join(outDir, `cena-andar${floorN}.png`), 2);
  errorsAll.push(...playFrames(game, input, 400).map(e => `andar${floorN}: ` + e.error.message));
}

// ---------------------------------------------------------------- cena 5: batalha do CEO
{
  const { game, input } = createHeadlessGame({ seed: 666 });
  startRun(game, 666, 'max');
  game.floorN = 6;
  const C = await import('../src/data/constants.js');
  game.floorData = C.FLOORS[5];
  game.floorScale = C.floorScale(6);
  game.floor = generateFloor(6, 666);
  game.player.stats.clipDamage = 22;
  game.player.stats.maxHp = 20; game.player.maxHp = 20; game.player.hp = 20;
  game.director.enterRoom(game.floor.bossRoom, null, true);
  playFrames(game, input, 200);
  save(game.canvas, path.join(outDir, 'cena-ceo.png'), 2);
  errorsAll.push(...playFrames(game, input, 900).map(e => 'ceo: ' + e.error.message));
}

// ---------------------------------------------------------------- cena 6: escolha de bencao
{
  const { game, input } = createHeadlessGame({ seed: 8080 });
  startRun(game, 8080, 'max');
  game.player.addBlessing((await import('../src/data/blessings.js')).BLESSINGS[0]);
  game.director.offerBlessing('SALA LIMPA');
  runFrames(game, 40);
  save(game.canvas, path.join(outDir, 'cena-bencaos.png'), 2);
}

if (errorsAll.length) {
  console.error('erros durante as capturas:');
  for (const e of errorsAll.slice(0, 8)) console.error('  ' + e);
  process.exit(1);
}
console.log('capturas OK');
