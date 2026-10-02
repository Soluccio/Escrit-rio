#!/usr/bin/env node
/**
 * smoke.mjs — teste de fumaca do jogo inteiro, 100% headless.
 * Um "bot" joga a run: caca inimigos, atira, pega bencaos, segue para a sala
 * do chefe, usa o elevador e vai trocando de andar.
 *
 *   node tools/smoke.mjs [frames] [seed] [--fast]
 *
 * --fast: buffa o player para atravessar os 6 andares e testar chefe final,
 *         transicoes e telas de vitoria (teste de integracao).
 */
import { createHeadlessGame, startRun, runFrames } from './headless.mjs';

const args = process.argv.slice(2);
const FAST = args.includes('--fast');
const FRAMES = Number(args.find(a => !a.startsWith('--')) || 3600);
const SEED = Number(args.filter(a => !a.startsWith('--'))[1] || 4242);

const { game, input } = createHeadlessGame({ seed: SEED });
startRun(game, SEED, FAST ? 'ze' : 'max');
/** Em modo fast o player e buffado para testar a run inteira de ponta a ponta. */
function buffPlayer(p) {
  p.stats.clipDamage = 60;
  p.stats.fireRate = 0.35;
  p.stats.maxHp = 40; p.maxHp = 40; p.hp = 40;
  p.stats.damage = 3;
}
if (FAST) buffPlayer(game.player);
console.log(`> run seed ${SEED}${FAST ? ' (modo fast)' : ''} — andar ${game.floorN}`);

const DIRS = [
  { dx: 0, dy: -1, side: 'N' }, { dx: 0, dy: 1, side: 'S' },
  { dx: -1, dy: 0, side: 'W' }, { dx: 1, dy: 0, side: 'E' },
];

/** BFS no grafo de salas: proxima sala no caminho ate a do chefe. */
function nextRoomTowardBoss(floor, room) {
  const goal = floor.bossRoom;
  if (!goal || room === goal) return null;
  const prev = new Map();
  const q = [room];
  const seen = new Set([room]);
  while (q.length) {
    const cur = q.shift();
    if (cur === goal) break;
    for (const d of DIRS) {
      if (!cur.doors[d.side]) continue;
      const n = floor.at(cur.gx + d.dx, cur.gy + d.dy);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      prev.set(n, { room: cur, dir: d });
      q.push(n);
    }
  }
  if (!prev.has(goal)) return null;
  let node = goal;
  while (prev.get(node) && prev.get(node).room !== room) node = prev.get(node).room;
  const step = prev.get(node);
  return step ? step.dir : null;
}

let roomChanges = 0, floorsSeen = new Set([game.floorN]), bossesKilled = 0, deaths = 0;
let lastRoom = game.room;
let stuckTimer = 0, detour = 0, detourSign = 1, lastPos = { x: 0, y: 0 }, posTimer = 0;
const t0 = Date.now();

const errors = runFrames(game, FRAMES, (i, g) => {
  const p = g.player;

  // telas de escolha: aceita
  if (i % 30 === 0) input.press('confirm');
  if (i % 400 === 200) input.press('right');
  if (i % 500 === 100) input.press('pause');
  if (i % 500 === 130) input.press('pause');

  if (g.state !== 'PLAY') {
    // nas escolhas de final, escolhe a segunda opcao (quebrar o ciclo)
    if (g.state === 'WIN' && i % 200 === 0) input.press('down');
    input.move.x = 0; input.move.y = 0;
    input.hold('fire', false);
    return;
  }
  if (!p || p.dead) {
    deaths++;
    startRun(g, SEED + deaths, FAST ? 'ze' : 'max');
    if (FAST) buffPlayer(g.player);
    return;
  }

  const room = g.room;
  floorsSeen.add(g.floorN);

  // deteccao de travamento: se quase nao andou, contorna o obstaculo em diagonal
  posTimer++;
  if (posTimer >= 45) {
    const moved = Math.hypot(p.x - lastPos.x, p.y - lastPos.y);
    if (moved < 5) { detour = 55; detourSign = Math.random() < 0.5 ? 1 : -1; stuckTimer++; }
    lastPos = { x: p.x, y: p.y };
    posTimer = 0;
  }
  bossesKilled = g.stats.minibossesKilled;
  if (room !== lastRoom) { roomChanges++; lastRoom = room; }

  // ---- combate: mira no mais proximo, mantem distancia e desvia
  let enemy = null, bestD = Infinity;
  for (const e of room.entities) {
    if (e.dead || !e.isEnemy) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < bestD) { bestD = d; enemy = e; }
  }
  if (enemy) {
    const dx = enemy.x - p.x, dy = enemy.y - p.y;
    const d = bestD || 1;
    input.aimDir.x = dx / d; input.aimDir.y = dy / d;
    // distancia de seguranca: fora do alcance do inimigo (kiting)
    const threat = (enemy.atkRange || 24) + 14;
    const keep = enemy.isBoss ? Math.max(56, threat) : threat;
    if (d > keep * 1.25) {              // longe: aproxima atirando
      input.move.x = dx / d; input.move.y = dy / d;
    } else if (d < keep) {              // perto demais: recua em diagonal
      const st = (i % 120 < 60 ? 1 : -1) * 0.6;
      input.move.x = -dx / d + (-dy / d) * st;
      input.move.y = -dy / d + (dx / d) * st;
    } else {                            // na medida: orbita (strafe)
      const st = (Math.floor(i / 45) % 2 ? 1 : -1);
      input.move.x = (-dy / d) * st;
      input.move.y = (dx / d) * st;
    }
    input.hold('fire', true);
    // dash de escape quando o inimigo cola ou esta telegrafando perto
    if (d < 30 && (enemy.state === 'TELEGRAPH' || enemy.state === 'ATTACK' || d < 22) && i % 12 === 0) {
      input.press('dash');
    }
    // execucao: o botao E no inimigo com postura cheia
    if (enemy.executable && d < 26 && i % 20 === 0) input.press('interact');
    if (i % 110 === 0) input.press('secondary');
    return;
  }

  // ---- sala limpa
  input.hold('fire', false);
  const elevator = (room.interactables || []).find(x => x.kind === 'elevator');
  const shopInter = (room.interactables || []).find(x => x.kind === 'shop');
  const coffee = (room.interactables || []).find(x => x.kind === 'coffee' && !x.used);
  const chest = (room.interactables || []).find(x => x.kind === 'chest' && !x.used);
  const secret = (room.interactables || []).find(x => x.kind === 'secret' && !x.used);
  const event = (room.interactables || []).find(x => x.kind === 'event' && !x.used);

  let target = null, act = false;
  if (secret) { target = secret; act = true; }
  else if (chest) { target = chest; act = true; }
  else if (coffee && p.hp < p.maxHp) { target = coffee; act = true; }
  else if (event) { target = event; act = true; }
  else if (elevator && elevator.data.unlocked) { target = elevator; act = true; }
  else if (shopInter && i % 200 < 40) { target = shopInter; act = true; }

  if (!target) {
    const dir = nextRoomTowardBoss(g.floor, room);
    // explora: se nao ha caminho conhecido, caca a parede secreta
    if (dir) {
      const pos = room.map.doorCenter(dir.side);
      const pull = dir.side === 'N' ? { x: room.w / 2, y: 6 }
        : dir.side === 'S' ? { x: room.w / 2, y: room.h - 6 }
        : dir.side === 'W' ? { x: 6, y: room.h / 2 } : { x: room.w - 6, y: room.h / 2 };
      target = pull;
    } else {
      // sem rota: anda atirando nas paredes (acha a parede secreta)
      const map = room.map;
      const wall = room.secretNeighbor ? room.map.doorCenter(room.secretNeighbor.side) : room.center;
      target = wall;
      input.aimDir.x = 1; input.aimDir.y = 0;
      input.hold('fire', true);
    }
  }

  if (target) {
    const dx = target.x - p.x, dy = target.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    input.move.x = dx / d; input.move.y = dy / d;
    if (detour > 0) {         // contorna o movel em diagonal
      detour--;
      input.move.x = dx / d + (-dy / d) * detourSign * 1.4;
      input.move.y = dy / d + (dx / d) * detourSign * 1.4;
    }
    if (act && d < (target.radius || 16) + 6) input.press('interact');
  }
});

const elapsed = Date.now() - t0;
console.log(`> ${FRAMES} frames em ${elapsed}ms (${(FRAMES / (elapsed / 1000)).toFixed(0)} fps headless)`);
console.log(`> estado final ${game.state}  andar ${game.floorN}  salas trocadas ${roomChanges}x  andares visitados ${[...floorsSeen].join(',')}`);
console.log(`> abates ${game.stats.kills ?? 0}  mini-bosses ${bossesKilled}  moedas ${game.stats.coins}  mortes ${deaths}`);
console.log(`> bencaos ${game.player?.stats.blessings.length}  selos ${game.save.data.seals}  finais ${JSON.stringify(game.save.data.endings)}`);
console.log(`> travamentos detectados ${stuckTimer}`);
console.log(`> particulas ${game.fx.particles.filter(p => p.active).length}/120  projeteis ${game.projectiles.activeCount}  hazards ${game.hazards.list.length}`);

if (errors.length) {
  console.error(`X ${errors.length} erros de runtime:`);
  for (const e of errors) {
    console.error(`  frame ${e.frame}: ${e.error.message}`);
    console.error('  ' + e.error.stack.split('\n').slice(1, 4).join('\n  '));
  }
  process.exit(1);
}
console.log('OK — nenhum erro de runtime');
