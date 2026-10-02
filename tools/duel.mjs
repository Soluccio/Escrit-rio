#!/usr/bin/env node
/**
 * duel.mjs — medidor de dificuldade: um "player competente" (bot que mira,
 * mantem distancia e usa o dash para escapar) limpa salas de combate e o
 * script reporta dano tomado, tempo e abates. Serve para calibrar o balance.
 *
 *   node tools/duel.mjs [salas] [andar] [--build=mid]
 *
 * --build=mid simula um player no meio da run (5 coracoes, +30% dano,
 *   cadencia melhor, perfuracao, 2 dashes) — a comparacao que importa para
 *   calibrar a curva de dificuldade.
 */
import { createHeadlessGame, startRun, runFrames } from './headless.mjs';

const ROOMS = Number(process.argv[2] || 8);
const FLOOR = Number(process.argv[3] || 1);
const MID = process.argv.includes('--build=mid');

/** Kit plausivel de meio de run (o que um player costuma ter no andar 4-5). */
function midBuild(p) {
  p.stats.maxHp = 5; p.maxHp = 5; p.hp = 5;
  p.stats.damage *= 1.3;
  p.stats.fireRate *= 0.8;
  p.stats.pierce = 1;
  p.stats.dashCharges = 2;
  p.dashCharges = 2;
}

const rows = [];
for (let seed = 0; seed < ROOMS; seed++) {
  const { game, input } = createHeadlessGame({ seed: 1000 + seed });
  startRun(game, 1000 + seed, 'max');
  if (FLOOR > 1) {
    const c = await import('../src/data/constants.js');
    game.floorN = FLOOR;
    game.floorData = c.FLOORS[FLOOR - 1];
    game.floorScale = c.floorScale(FLOOR);
    const { generateFloor } = await import('../src/world/RoomGenerator.js');
    game.floor = generateFloor(FLOOR, 555 + seed);
  }
  if (MID) midBuild(game.player);
  const room = game.floor.list.find(r => r.type === 'combat');
  game.director.enterRoom(room, null, true);
  const p = game.player;
  const hp0 = p.hp;
  let frames = 0;
  const errors = runFrames(game, 3600, (i, g) => {
    frames++;
    if (p.dead) return;
    // ---- politica do bot competente
    let enemy = null, bestD = Infinity;
    for (const e of g.room.entities) {
      if (e.dead || !e.isEnemy) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < bestD) { bestD = d; enemy = e; }
    }
    if (!enemy) { input.move.x = 0; input.move.y = 0; input.hold('fire', false); return; }
    const dx = (enemy.x - p.x) / (bestD || 1), dy = (enemy.y - p.y) / (bestD || 1);
    input.aimDir.x = dx; input.aimDir.y = dy;
    input.hold('fire', true);
    const danger = bestD < 30 || (enemy.state === 'TELEGRAPH' && bestD < 55);
    if (danger && p.dashCharges > 0) {
      input.move.x = -dx; input.move.y = -dy;      // dash de escape
      if (i % 6 === 0) input.press('dash');
    } else if (bestD < 46) {
      const st = (Math.floor(i / 40) % 2 ? 1 : -1); // strafe mantendo distancia
      input.move.x = -dx + (-dy) * st;
      input.move.y = -dy + dx * st;
    } else {
      input.move.x = dx; input.move.y = dy;
    }
    if (enemy.executable && bestD < 24 && i % 15 === 0) input.press('interact');
    input.press('secondary');
  });
  const dmg = hp0 - Math.max(0, p.hp);
  const clear = !room.entities.some(e => !e.dead && e.isEnemy);
  rows.push({ seed: 1000 + seed, dano: dmg, morto: p.dead, limpou: clear, seg: (frames / 60).toFixed(1), erros: errors.length });
}

const avg = rows.reduce((a, r) => a + r.dano, 0) / rows.length;
const mortes = rows.filter(r => r.morto).length;
const limpos = rows.filter(r => r.limpou).length;
console.log(`andar ${FLOOR} — ${ROOMS} salas de combate (${MID ? 'build de meio de run' : 'player inicial: 3 coracoes'})`);
for (const r of rows) console.log(`  seed ${r.seed}: dano ${r.dano}  morto ${r.morto}  sala limpa ${r.limpou}  ${r.seg}s`);
console.log(`media de dano por sala: ${avg.toFixed(1)} | mortes: ${mortes}/${ROOMS} | salas limpas: ${limpos}/${ROOMS}`);
