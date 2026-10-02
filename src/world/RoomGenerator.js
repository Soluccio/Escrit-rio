/**
 * RoomGenerator.js — gera o predio de cada andar: grid 9x9 com caminho
 * principal + ramificacoes. SEMPRE garante:
 *   - 1 sala de spawn no inicio do caminho principal
 *   - 1 sala de mini-boss (ou boss no ultimo andar) NO caminho principal
 *   - >= 1 tesouro, <= 1 loja, 1 descanso, 1 evento
 *   - chance de 1 sala secreta atras de parede destrutivel
 *   - caminho viavel do spawn ate o boss (verificado com BFS no fim)
 */
import { GRID } from '../data/constants.js';
import { ROOM_RULES, ROOM_WEIGHTS } from '../data/rooms.js';
import { RNG } from '../core/RNG.js';
import { Room } from './Room.js';

const DIRS = [
  { dx: 0, dy: -1, side: 'N', opp: 'S' },
  { dx: 0, dy: 1, side: 'S', opp: 'N' },
  { dx: -1, dy: 0, side: 'W', opp: 'E' },
  { dx: 1, dy: 0, side: 'E', opp: 'W' },
];

export class Floor {
  constructor(n, rooms, start, bossRoom, rng) {
    this.n = n;
    this.rooms = rooms;         // Map "gx,gy" -> Room
    this.start = start;
    this.bossRoom = bossRoom;
    this.current = start;
    this.rng = rng;
  }

  at(gx, gy) { return this.rooms.get(`${gx},${gy}`) || null; }
  get list() { return [...this.rooms.values()]; }
  count(type) { return this.list.filter(r => r.type === type).length; }
  get boss() { return this.bossRoom; }
}

/** Chave do grid. */
const K = (gx, gy) => `${gx},${gy}`;

/**
 * Gera um andar completo.
 * @param {number} floorN numero do andar (1..6)
 * @param {number} seed semente base
 */
export function generateFloor(floorN, seed) {
  const rng = new RNG(seed);
  const rooms = new Map();
  const weights = ROOM_WEIGHTS[floorN] || ROOM_WEIGHTS[1];

  // ---------------------------------------------------------------- caminho principal
  const startPos = { gx: rng.int(1, 2), gy: rng.int(2, GRID - 3) };
  const path = [startPos];
  const inPath = new Set([K(startPos.gx, startPos.gy)]);
  const pathLen = rng.int(ROOM_RULES.mainPathLen[0], ROOM_RULES.mainPathLen[1]);
  let guard = 0;
  while (path.length < pathLen && guard++ < 400) {
    const cur = path[path.length - 1];
    const prev = path[path.length - 2] || { gx: -99, gy: -99 };
    // prefere seguir para a direita (progresso), com desvios
    const options = DIRS.filter(d => {
      const nx = cur.gx + d.dx, ny = cur.gy + d.dy;
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) return false;
      if (inPath.has(K(nx, ny))) return false;
      // evita encostar no proprio caminho (cria atalhos ambiguos) — o vizinho
      // anterior/atual e permitido, os demais nao
      for (const d2 of DIRS) {
        const ax = nx + d2.dx, ay = ny + d2.dy;
        if (ax === cur.gx && ay === cur.gy) continue;
        if (ax === prev.gx && ay === prev.gy) continue;
        if (inPath.has(K(ax, ay))) return false;
      }
      return true;
    });
    if (!options.length) break;
    const weighted = options.flatMap(o => (o.side === 'E' ? [o, o, o] : [o]));
    const pick = rng.pick(weighted);
    const nx = cur.gx + pick.dx, ny = cur.gy + pick.dy;
    path.push({ gx: nx, gy: ny });
    inPath.add(K(nx, ny));
  }

  // ---------------------------------------------------------------- tipos obrigatorios
  const bossType = floorN >= 6 ? 'boss' : 'miniboss';
  const types = new Map();          // "gx,gy" -> tipo
  types.set(K(path[0].gx, path[0].gy), 'spawn');
  const last = path[path.length - 1];
  types.set(K(last.gx, last.gy), bossType);

  // vagas do caminho (sem inicio/fim) para salas especiais
  const midPath = path.slice(1, -1);
  const shuffledMid = rng.shuffle(midPath);
  const mandatory = ['treasure', 'rest', 'event'];
  let mi = 0;
  for (const t of mandatory) {
    while (mi < shuffledMid.length && types.has(K(shuffledMid[mi].gx, shuffledMid[mi].gy))) mi++;
    if (mi >= shuffledMid.length) break;
    const cell = shuffledMid[mi++];
    types.set(K(cell.gx, cell.gy), t);
  }
  if (rng.chance(0.8) && mi < shuffledMid.length) {
    const cell = shuffledMid[mi++];
    types.set(K(cell.gx, cell.gy), 'shop');
  }
  // tesouro extra garantido
  while (mi < shuffledMid.length) {
    if (types.get(K(shuffledMid[mi].gx, shuffledMid[mi].gy)) === undefined) {
      types.set(K(shuffledMid[mi].gx, shuffledMid[mi].gy), 'treasure');
      mi++;
      break;
    }
    mi++;
  }
  // resto do caminho = combate
  for (const cell of midPath) {
    const k = K(cell.gx, cell.gy);
    if (!types.has(k)) types.set(k, 'combat');
  }

  // ---------------------------------------------------------------- ramificacoes
  const branchCount = rng.int(ROOM_RULES.branches[0], ROOM_RULES.branches[1]);
  const branchHosts = rng.shuffle(path.slice(1)).slice(0, branchCount);
  const branchCells = [];
  for (const host of branchHosts) {
    const dirs = rng.shuffle(DIRS);
    for (const d of dirs) {
      const nx = host.gx + d.dx, ny = host.gy + d.dy;
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
      if (types.has(K(nx, ny))) continue;
      const len = rng.int(1, 3);
      let cx2 = nx, cy2 = ny, ok = true;
      const chain = [];
      for (let i = 0; i < len; i++) {
        if (cx2 < 0 || cy2 < 0 || cx2 >= GRID || cy2 >= GRID || types.has(K(cx2, cy2))) { ok = i > 0; break; }
        chain.push({ gx: cx2, gy: cy2 });
        cx2 += d.dx; cy2 += d.dy;
      }
      if (!ok || !chain.length) continue;
      for (const c of chain) { types.set(K(c.gx, c.gy), 'combat'); branchCells.push(c); }
      break;
    }
  }

  // ---------------------------------------------------------------- preenchimento
  const pool = [];
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      if (types.has(K(gx, gy))) continue;
      const near = DIRS.some(d => types.has(K(gx + d.dx, gy + d.dy)));
      if (near) pool.push({ gx, gy });
    }
  }
  const shuffledPool = rng.shuffle(pool);
  const maxRooms = 24;
  for (const cell of shuffledPool) {
    if (types.size >= maxRooms) break;
    const near2 = DIRS.filter(d => types.has(K(cell.gx + d.dx, cell.gy + d.dy))).length;
    if (near2 >= 2 && rng.chance(0.35)) continue;      // evita bloquear tudo
    if (!rng.chance(0.55)) continue;
    const picked = weightedType(rng, weights);
    types.set(K(cell.gx, cell.gy), picked);
  }

  // ---------------------------------------------------------------- sala secreta
  let secretCell = null;
  if (rng.chance(0.7)) {
    for (const cell of rng.shuffle([...types.keys()].map(k => {
      const [gx, gy] = k.split(',').map(Number);
      return { gx, gy };
    }))) {
      const d = rng.pick(DIRS);
      const nx = cell.gx + d.dx, ny = cell.gy + d.dy;
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
      if (types.has(K(nx, ny))) continue;
      types.set(K(nx, ny), 'secret');
      secretCell = { gx: nx, gy: ny, doorSide: d.opp, host: cell };
      break;
    }
  }

  // ---------------------------------------------------------------- instancia as salas
  for (const [key, type] of types) {
    const [gx, gy] = key.split(',').map(Number);
    const roomRng = rng.derive(`${floorN}:${gx}:${gy}:${type}`);
    rooms.set(key, new Room(gx, gy, type, floorN, roomRng));
  }

  // ---------------------------------------------------------------- portas (simetricas)
  for (const room of rooms.values()) {
    for (const d of DIRS) {
      const neighbor = rooms.get(K(room.gx + d.dx, room.gy + d.dy));
      if (!neighbor) continue;
      // a sala secreta nao tem porta normal, e sim parede destrutivel
      if (neighbor.type === 'secret' || room.type === 'secret') continue;
      room.doors[d.side] = true;
    }
  }

  // parede destrutivel da sala secreta
  if (secretCell) {
    const secretRoom = rooms.get(K(secretCell.gx, secretCell.gy));
    const host = rooms.get(K(secretCell.host.gx, secretCell.host.gy));
    secretRoom.secretWall = { side: secretCell.doorSide, weak: true };
    // marca qual lado do host da para a parede
    const opposite = { N: 'S', S: 'N', E: 'W', W: 'E' }[secretCell.doorSide];
    host.secretNeighbor = { side: opposite, room: secretRoom };
    secretRoom.hostRoom = host;
  }

  const startRoom = rooms.get(K(path[0].gx, path[0].gy));
  const bossRoom = rooms.get(K(last.gx, last.gy));
  const floor = new Floor(floorN, rooms, startRoom, bossRoom, rng);
  // porta "atras" do spawn fica trancada (nao tem volta)
  startRoom.sealBackDoor = true;
  floor.wallSecret = secretCell;
  return floor;
}

function weightedType(rng, w) {
  const entries = Object.entries(w);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  let r = rng.next() * total;
  for (const [k, v] of entries) { r -= v; if (r <= 0) return k; }
  return 'combat';
}

/**
 * Verifica que existe caminho do spawn ate o boss (BFS pelas portas).
 * Usado nos testes: 10 seeds diferentes devem sempre passar.
 */
export function verifyFloor(floor) {
  const seen = new Set();
  const q = [floor.start];
  seen.add(K(floor.start.gx, floor.start.gy));
  while (q.length) {
    const room = q.shift();
    if (room === floor.bossRoom) return true;
    for (const d of DIRS) {
      if (!room.doors[d.side]) continue;
      const n = floor.at(room.gx + d.dx, room.gy + d.dy);
      if (!n) continue;
      const k = K(n.gx, n.gy);
      if (seen.has(k)) continue;
      seen.add(k); q.push(n);
    }
  }
  return false;
}

/** Estatisticas de um andar (usadas em testes e debug). */
export function floorStats(floor) {
  const byType = {};
  for (const r of floor.list) byType[r.type] = (byType[r.type] || 0) + 1;
  return { total: floor.rooms.size, byType, hasBoss: !!floor.bossRoom, viable: verifyFloor(floor) };
}
