/**
 * EnemyAI.js — comportamentos da FSM dos inimigos.
 *
 * Cada estado tem uma funcao com a assinatura (e, dt, game, d) onde
 * e = inimigo, dt = delta fixo, game = jogo e d = distancia ate o player.
 * Ficou em arquivo separado para o Enemy.js e este modulo caberem na regra
 * de "todo arquivo abaixo de 400 linhas".
 *
 * Regras de design:
 *  - todo ataque passa por TELEGRAPH (0.25s a 0.6s) antes de ATTACK
 *  - perseguicao usa o FlowField da sala (BFS) quando nao ha linha de visao
 *  - 3+ inimigos na mesma sala ganham papeis (pursue/flank/keepDistance)
 *  - separacao suave impede inimigos de se empilharem
 */
import { STATE } from './EnemyState.js';
import { ENEMY, TILE, TUNING } from '../data/constants.js';
import { dist, hasLOS, moveWithTiles, lerp } from '../core/Physics.js';

/** menor diferenca entre dois angulos (radianos). */
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Escolhe o estado de combate conforme o arquetipo. */
export function pickCombatState(e) {
  if (e.arch === 'support') return STATE.SUPPORT;
  if (e.arch === 'sniper') return STATE.SNIPE;
  return STATE.CHASE;
}

/** Mantem distancia preferida do arquetipo (ranged fica longe, rusher cola). */
export function preferredDistance(e) {
  const p = e.def.preferred || 0;
  if (e.role === 'keepDistance') return p + 26;
  if (e.role === 'flank') return p + 10;
  return p;
}

/** Distancia de ataque efetiva (ataques em area usam o raio do aoe). */
function attackReach(e) {
  return Math.max(e.atkRange, e.def.aoe || 0) + (e.big ? 6 : 0);
}

// ---------------------------------------------------------------- ESTADOS

/** PARADO: olha em volta; se ve o player, alerta. */
export function doIdle(e, dt, game, d) {
  e.vx *= 0.85; e.vy *= 0.85;
  e.wanderTimer -= dt;
  const player = game.player;
  if (e.hasLos && d < e.sight) {
    e.setState(STATE.ALERT);
    return;
  }
  if (e.wanderTimer <= 0) {
    // sorteia uma direcao de patrulha e um tempo
    e.wanderTimer = game.rng.range(1.2, 3.0);
    const a = game.rng.range(0, Math.PI * 2);
    e.wanderDir.x = Math.cos(a);
    e.wanderDir.y = Math.sin(a);
    e.setState(STATE.PATROL);
  }
}

/** PATRULHA: anda na direcao sorteada, troca ao bater na parede. */
export function doPatrol(e, dt, game, d) {
  const player = game.player;
  if (e.hasLos && d < e.sight) { e.setState(STATE.ALERT); return; }
  e.patrolTimer = (e.patrolTimer || 0) - dt;
  const sp = e.speed * 0.45;
  const before = { x: e.x, y: e.y };
  moveTowards(e, game, {
    x: e.x + e.wanderDir.x * 40,
    y: e.y + e.wanderDir.y * 40,
  }, sp, dt);
  if (e.patrolTimer <= 0 && (Math.abs(e.x - before.x) < 0.05 && Math.abs(e.y - before.y) < 0.05)) {
    e.patrolTimer = 0.6;
    e.wanderDir.x = -e.wanderDir.x;
    e.wanderDir.y = -e.wanderDir.y;
  }
  if (Math.abs(e.vx) > 1) e.facing = e.vx < 0 ? -1 : 1;
  e.wanderTimer -= dt;
  if (e.wanderTimer <= 0) e.setState(STATE.IDLE);
}

/** ALERTA: para, vira para o player e "pensa" por ENEMY.alertTime. */
export function doAlert(e, dt, game, d) {
  e.vx *= 0.7; e.vy *= 0.7;
  const player = game.player;
  e.facing = player.x < e.x ? -1 : 1;
  e.aimAngle = Math.atan2(player.y - e.y, player.x - e.x);
  if (e.stateTimer >= ENEMY.alertTime) {
    e.setState(pickCombatState(e));
    game.fx.text(e.x, e.y - e.h, '!', '#ffcf4d');
    game.audio.sfx('alert', { volume: 0.35 });
  }
}

/** PERSEGUICAO: vai ate o player (flow field sem LOS) e ataca no alcance. */
export function doChase(e, dt, game, d) {
  const player = game.player;
  // ataque: precisa de alcance, recarga pronta e linha de visao
  if (e.hasLos && d <= attackReach(e) && e.cooldownTimer <= 0 && !player.dead) {
    e.setState(STATE.TELEGRAPH);
    return;
  }
  // ranged lento prefere manter distancia
  const standoff = preferredDistance(e);
  if (standoff > 0 && d < standoff - 12 && e.arch === 'ranged') {
    e.setState(STATE.RETREAT);
    return;
  }
  const target = targetPoint(e, game, d);
  const speed = e.speed * (e.role === 'flank' ? 1.08 : 1) * (e.slowTimer > 0 ? 0.5 : 1);
  moveTowards(e, game, target, speed, dt);
}

/** Ponto de mira: flanqueadores miram a lateral, outros miram o corpo. */
export function targetPoint(e, game, d) {
  const player = game.player;
  if (e.role === 'flank') {
    // ponto ao lado do player, perpendicular a direcao dele
    const side = e.id % 2 === 0 ? 1 : -1;
    return {
      x: player.x + Math.cos(player.aimAngle + Math.PI / 2 * side) * 26,
      y: player.y + Math.sin(player.aimAngle + Math.PI / 2 * side) * 26,
    };
  }
  if (e.role === 'keepDistance' && e.def.preferred) {
    const a = Math.atan2(e.y - player.y, e.x - player.x);
    return { x: player.x + Math.cos(a) * e.def.preferred, y: player.y + Math.sin(a) * e.def.preferred };
  }
  return { x: player.x, y: player.y };
}

/** TELEGRAFIA: aura vermelha, linha de aviso, congela a mira, depois ataca. */
export function doTelegraph(e, dt, game, d) {
  const player = game.player;
  e.telegraphProgress = Math.min(1, e.stateTimer / Math.max(0.05, e.telegraphTime));
  e.vx *= 0.8; e.vy *= 0.8;
  // mira: preve um pouco o movimento do player (mais justo e mais ameacador)
  const lead = Math.min(0.35, e.telegraphTime * 0.5);
  const px = player.x + player.vx * lead;
  const py = player.y + player.vy * lead;
  e.attackAngle = Math.atan2(py - e.y, px - e.x);
  e.facing = Math.cos(e.attackAngle) < 0 ? -1 : 1;
  // som de carga no comeco da telegrafia
  if (!e.telegraphPlayed) {
    e.telegraphPlayed = true;
    game.audio.sfx('telegraph', { volume: 0.3, pitch: 1.1 + e.telegraphProgress * 0.2 });
  }
  if (e.stateTimer >= e.telegraphTime) e.setState(STATE.ATTACK);
}

/** ATAQUE: dispara uma vez, depois volta a perseguir. */
export function doAttack(e, dt, game, d) {
  if (!e.attackDone) {
    e.attackDone = true;
    const beforePlayerHp = game.player.hp;
    performAttack(e, game, d);
    e.hitPlayer = game.player.hp < beforePlayerHp;
    // ataques que encurralam (cabo) aplicam lentidao
    if (e.def.slow && e.hitPlayer) {
      game.player.slowTimer = Math.max(game.player.slowTimer, 2.0);
      game.player.slowFactor = e.def.slow;
      game.fx.text(game.player.x, game.player.y - 14, 'LENTO!', '#81c784');
    }
    e.attackAngleBackup = e.attackAngle;
  }
  e.vx *= 0.8; e.vy *= 0.8;
  const total = e.def.arch === 'tank' ? 0.42 : 0.26;
  if (e.stateTimer >= total) {
    e.cooldownTimer = e.cooldown * (e.slowTimer > 0 ? 1.5 : 1);
    if (e.arch === 'ranged' && Math.random() < 0.5) e.setState(STATE.RETREAT);
    else e.setState(STATE.CHASE);
  }
}

/** RECUO: ranged/ranged foge um pouco para poder atirar de novo. */
export function doRetreat(e, dt, game, d) {
  const player = game.player;
  const a = Math.atan2(e.y - player.y, e.x - player.x);
  e.facing = player.x < e.x ? -1 : 1;
  moveTowards(e, game, { x: e.x + Math.cos(a) * 40, y: e.y + Math.sin(a) * 40 }, e.speed * 1.1, dt);
  if (e.stateTimer > 0.6 || d > e.sight) e.setState(pickCombatState(e));
}

/** SUPORTE (cafe, fantasma): ronda perto, teleporta e incomoda. */
export function doSupport(e, dt, game, d) {
  const player = game.player;
  if (e.def.blink) {
    // o fantasma desaparece e reaparece perto do player
    e.blinkTimer -= dt;
    if (e.blinkTimer <= 0) {
      e.blinkTimer = game.rng.range(3.0, 4.5);
      const a = game.rng.range(0, Math.PI * 2);
      const nx = player.x + Math.cos(a) * game.rng.range(28, 48);
      const ny = player.y + Math.sin(a) * game.rng.range(28, 48);
      if (!game.room.map.isSolidAt(nx, ny)) {
        game.fx.burst(e.x, e.y, 'spark', { count: 10 });
        e.x = nx; e.y = ny;
        game.fx.burst(e.x, e.y, 'spark', { count: 10 });
        game.audio.sfx('ghost');
      }
    }
  }
  // mantem uma distancia media do player
  const standoff = e.def.preferred ? e.def.preferred : 46;
  if (d < standoff - 18) {
    const a = Math.atan2(e.y - player.y, e.x - player.x);
    moveTowards(e, game, { x: e.x + Math.cos(a) * 30, y: e.y + Math.sin(a) * 30 }, e.speed * 0.9, dt);
  } else if (d > standoff + 26) {
    moveTowards(e, game, { x: player.x, y: player.y }, e.speed * 0.85, dt);
  } else {
    // orbita o player (nunca fica parado no mesmo lugar)
    const a = Math.atan2(e.y - player.y, e.x - player.x) + 0.9 * dt;
    moveTowards(e, game, { x: player.x + Math.cos(a) * standoff, y: player.y + Math.sin(a) * standoff }, e.speed * 0.7, dt);
  }
  if (e.hasLos && d <= attackReach(e) && e.cooldownTimer <= 0) e.setState(STATE.TELEGRAPH);
  else if (!e.hasLos && e.stateTimer > 4) e.setState(doIdle(e, dt, game, d));
}

/** SNIPE (bug ancestral): fica longe, mira por mais tempo e dispara rajada. */
export function doSnipe(e, dt, game, d) {
  const player = game.player;
  const standoff = e.def.preferred || 150;
  if (d > standoff + 40) {
    moveTowards(e, game, { x: player.x, y: player.y }, e.speed * 0.8, dt);
  } else if (d < standoff - 30) {
    const a = Math.atan2(e.y - player.y, e.x - player.x);
    moveTowards(e, game, { x: e.x + Math.cos(a) * 30, y: e.y + Math.sin(a) * 30 }, e.speed, dt);
  } else {
    e.vx *= 0.85; e.vy *= 0.85;
  }
  if (e.hasLos && d <= e.atkRange && e.cooldownTimer <= 0) e.setState(STATE.TELEGRAPH);
}

/** DOR: recuo curto e volta para o combate. */
export function doHurt(e, dt, game, d) {
  const player = game.player;
  e.vx *= 0.86; e.vy *= 0.86;
  e.facing = player.x < e.x ? -1 : 1;
  if (e.stateTimer >= ENEMY.hurtTime) {
    if (e.generation >= 0 && e.arch === 'rusher' && d > 90) e.setState(STATE.RETREAT);
    else e.setState(d < e.sight ? pickCombatState(e) : STATE.IDLE);
  }
}

// -------------------------------------------------------------- MOVIMENTO

/**
 * Move o inimigo em direcao a um ponto, com steering suave.
 * Sem linha de visao, usa o FlowField da sala (pathfinding BFS em grid).
 */
export function moveTowards(e, game, target, speed, dt) {
  let dx = target.x - e.x, dy = target.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  let nx = dx / d, ny = dy / d;

  if (!e.hasLos) {
    const dir = game.flow.directionAt(e.x, e.y, game.player.x, game.player.y);
    if (dir && (Math.abs(dir.x) + Math.abs(dir.y) > 0.1)) { nx = dir.x; ny = dir.y; }
  }
  // bugs correm em zigue-zague
  if (e.def.zigzag) {
    const wob = Math.sin(e.time * 9 + e.id) * 0.5;
    const px = -ny, py = nx;
    nx += px * wob; ny += py * wob;
    const n = Math.hypot(nx, ny) || 1;
    nx /= n; ny /= n;
  }
  // aceleracao suave (evita robo andando de lado)
  e.steered = true;
  const k = Math.min(1, dt * 10);
  e.vx += (nx * speed - e.vx) * k;
  e.vy += (ny * speed - e.vy) * k;
  if (Math.abs(e.vx) > 4) e.facing = e.vx < 0 ? -1 : 1;
}

/** Aplica velocidade + knockback + colisao e a separacao suave. */
export function applyMovement(e, dt, game) {
  const map = game.room.map;
  const kb = e.integrateKnockback(dt);
  const hit = moveWithTiles(e, (e.vx + kb.x) * dt, (e.vy + kb.y) * dt, map);
  if (hit.x) e.vx = 0;
  if (hit.y) e.vy = 0;
  // atrito so quando nenhum estado esta dirigindo (senao o inimigo nunca
  // alcanca a velocidade maxima definida nos dados)
  if (!e.steered) {
    const fr = Math.pow(0.0015, dt);
    e.vx *= fr; e.vy *= fr;
  }
  e.steered = false;
  if (Math.abs(e.vx) < 1) e.vx = 0;
  if (Math.abs(e.vy) < 1) e.vy = 0;

  // separacao suave: ninguem fica empilhado em cima de ninguem
  const list = game.room.entities;
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    if (o === e || o.dead || !o.isEnemy || o.noPush) continue;
    let dx = e.x - o.x, dy = e.y - o.y;
    const rr = (e.radius || 6) + (o.radius || 6);
    let d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) continue;
    if (d2 < 0.0001) { dx = 1; dy = 0; d2 = 1; }
    const dd = Math.sqrt(d2);
    const push = (rr - dd) * 0.5;
    moveWithTiles(e, (dx / dd) * push, (dy / dd) * push, map);
  }
  // mantem dentro dos limites da sala (portas ficam nos tiles de borda)
  e.x = Math.max(e.w / 2, Math.min(game.room.w - e.w / 2, e.x));
  e.y = Math.max(e.h / 2, Math.min(game.room.h - e.h / 2, e.y));
}

// --------------------------------------------------------------- ATAQUES

/**
 * Ataque corpo a corpo base: acerta em cone curto, deixa um "dash de contato"
 * ativo (dano por encostar) e solta o feedback de juice.
 */
export function performAttack(e, game, d) {
  const player = game.player;
  const reach = attackReach(e);
  const ang = e.attackAngle;
  const angToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
  const inCone = Math.abs(angleDiff(angToPlayer, ang)) < 1.2;
  const inRange = dist(e, player) <= reach + player.radius;

  if (inCone && inRange) {
    game.combat.hitPlayer(e, e.damage, {});
  }
  // investida: encostar tambem machuca por um instante (rushers/tanks)
  e.contactDash = 0.18;

  game.fx.slash(e.x, e.y, ang, Math.max(10, reach * 0.7), e.arch === 'tank' ? '#e8e8f0' : '#ffffff');
  game.fx.burst(e.x + Math.cos(ang) * 8, e.y + Math.sin(ang) * 8, e.particlePreset, {
    dir: ang, count: e.arch === 'tank' ? 7 : 4, spread: 0.9,
  });
  if (e.def.aoe) game.fx.ring(e.x, e.y, 4, e.def.aoe, '#e8e8f0', 0.3, 2);
  game.audio.sfx(e.sfx, { volume: e.big ? 0.5 : 0.4 });
  game.camera.addShake(e.big ? 2.2 : 1.0);
}
