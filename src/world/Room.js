/**
 * Room.js — sala individual: tilemap, props, entidades, portas e ondas.
 * A sala cuida do proprio estado (fighting/cleared), spawn de inimigos por
 * onda e do "limpou tudo, abre as portas".
 */
import { TILE, T, BOSS_COLS, BOSS_ROWS, ROOM_COLS, ROOM_ROWS } from '../data/constants.js';
import { TileMap } from './TileMap.js';
import { roomTypeDef } from './RoomTypes.js';
import { scaleEnemy } from '../data/enemies.js';
import { waveConfig, ROOM_RULES } from '../data/rooms.js';
import { dist } from '../core/Physics.js';
import { floorScale } from '../data/constants.js';
import { Interactable } from '../entities/Interactable.js';

export class Room {
  constructor(gx, gy, type, floorN, rng) {
    this.gx = gx; this.gy = gy;
    this.type = type;
    this.def = roomTypeDef(type);
    this.floorN = floorN;
    this.rng = rng;
    this.seed = rng.s;
    this.big = !!this.def.boss;
    this.cols = this.big ? BOSS_COLS : ROOM_COLS;
    this.rows = this.big ? BOSS_ROWS : ROOM_ROWS;
    this.map = new TileMap(this.cols, this.rows);
    this.props = [];
    this.entities = [];
    this.projectiles = [];
    this.pickups = [];
    this.interactables = [];
    this.hazards = [];       // poças, zonas de pergunta, ondas de choque
    this.doors = { N: false, S: false, E: false, W: false };
    this.visited = false;
    this.discovered = false;
    this.cleared = type !== 'combat' && type !== 'miniboss' && type !== 'boss';
    this.started = false;
    this.waves = 0;
    this.currentWave = 0;
    this.waveTimer = 0;
    this.pendingSpawns = [];
    this.bossSpawned = false;
    this.boss = null;
    this.lootGiven = false;
    this.chest = null;
    this.shopItems = null;
    this.eventDone = false;
    this.built = false;
  }

  get w() { return this.map.w; }
  get h() { return this.map.h; }
  get center() { return { x: this.w / 2, y: this.h / 2 }; }

  /** Constroi tiles + props da sala (chamado ao entrar pela primeira vez). */
  build(sprites) {
    if (this.built) return;
    const rng = this.rng;
    this.map.theme = null;
    this.map.buildBox(this.def.floor === 'carpet' ? 'carpet' : 'floor', rng);
    for (const side of Object.keys(this.doors)) {
      if (this.doors[side]) this.map.carveDoor(side, 4, false);
    }
    this.props = this.def.props ? this.def.props(this.map, rng, this.floorN) : [];
    // decoração de chao
    for (let i = 0; i < 4; i++) {
      const cell = rng.pick(this.map.freeCells(3));
      this.map.addDecal(cell.cx * TILE + 8, cell.cy * TILE + 8, rng.pick(['stain', 'paper', 'tape', 'vent']));
    }
    this.map.prerender(sprites);
    this.built = true;
  }

  /** Abre/fecha as portas conforme o estado de combate. */
  setDoorsLocked(locked) {
    for (const side of Object.keys(this.doors)) {
      if (!this.doors[side]) continue;
      const t = locked ? T.DOOR_LOCKED : T.DOOR;
      const midX = Math.floor(this.cols / 2), midY = Math.floor(this.rows / 2);
      if (side === 'N') for (let i = 0; i < 4; i++) this.map.set(midX - 2 + i, 0, t);
      if (side === 'S') for (let i = 0; i < 4; i++) this.map.set(midX - 2 + i, this.rows - 1, t);
      if (side === 'W') for (let i = 0; i < 4; i++) this.map.set(0, midY - 2 + i, t);
      if (side === 'E') for (let i = 0; i < 4; i++) this.map.set(this.cols - 1, midY - 2 + i, t);
    }
  }

  /** Spawn de uma onda de inimigos longe do player. */
  spawnWave(game, player) {
    const scale = floorScale(this.floorN);
    const pool = game.floorData.pool;
    const free = this.map.freeCells(3).filter(c => {
      const x = c.cx * TILE, y = c.cy * TILE;
      return dist({ x, y }, player) > 90;
    });
    if (!free.length) return;
    const howMany = this.pendingSpawns.length || 3;
    for (let i = 0; i < howMany; i++) {
      const key = this.rng.pick(pool);
      const cell = free[this.rng.int(0, free.length - 1)];
      game.spawnEnemy(key, cell.cx * TILE + 8, cell.cy * TILE + 8, { scale });
    }
    this.pendingSpawns = [];
  }

  /** Prepara as ondas de combate deste andar/sala. */
  prepareWaves(floorN) {
    if (this.type !== 'combat') return;
    const cfg = waveConfig(floorN, this.rng);
    this.waves = cfg.waves;
    this.currentWave = 0;
    this.waveSize = cfg.perWave;
  }

  /** Chamado quando o player entra. Dispara a primeira onda / chefe. */
  start(game, player) {
    if (this.started) return;
    this.started = true;
    if (this.type === 'combat') {
      this.prepareWaves(this.floorN);
      this.pendingSpawns = new Array(this.waveSize || 3).fill(0);
      this.cleared = false;
      this.setDoorsLocked(true);
      this.spawnWave(game, player);
      game.fx.banner('SETOR ' + this.floorN + ' - ' + this.def.name.toUpperCase(), '#ffcf4d');
    } else if (this.type === 'miniboss' || this.type === 'boss') {
      this.cleared = false;
      this.setDoorsLocked(true);
      game.spawnBoss(this.def.boss || (this.type === 'boss'), player);
    } else if (this.type === 'treasure' && !this.chest) {
      this.chest = new Interactable('chest', this.w / 2, this.h / 2);
      this.interactables.push(this.chest);
    } else if (this.type === 'event' && !this.eventDone) {
      this.eventObject = new Interactable('event', this.w / 2, this.h / 2);
      this.interactables.push(this.eventObject);
    }
  }

  /** Verifica se a onda acabou; retorna true quando a sala fica limpa. */
  updateCombat(game) {
    if (this.cleared || !this.started) return false;
    const alive = this.entities.some(e => !e.dead && e.isEnemy);
    if (this.type === 'combat') {
      if (!alive) {
        if (this.currentWave < this.waves - 1) {
          this.currentWave++;
          this.waveTimer += 1;
          if (this.waveTimer >= 0.8) {
            this.waveTimer = 0;
            this.pendingSpawns = new Array(this.waveSize || 3).fill(0);
            this.spawnWave(game, game.player);
            game.fx.banner(`ONDA ${this.currentWave + 1}/${this.waves}`, '#ff8fa3');
          }
        } else {
          this.cleared = true;
          this.setDoorsLocked(false);
          game.onRoomCleared(this);
          return true;
        }
      }
      return false;
    }
    if ((this.type === 'miniboss' || this.type === 'boss') && this.boss && this.boss.dead && !alive) {
      this.cleared = true;
      this.setDoorsLocked(false);
      game.onBossRoomCleared(this);
      return true;
    }
    return false;
  }

  update(dt, game) {
    for (const p of this.props) if (!p.dead) p.update(dt);
    this.props = this.props.filter(p => !p.dead);
    for (const h of this.hazards) h.update?.(dt, game);
    this.hazards = this.hazards.filter(h => !h.dead);
    this.updateCombat(game);
  }

  draw(ctx, sprites, time, view) {
    this.map.draw(ctx, sprites, time, view);
  }

  /** Props ordenados por Y (para desenhar com profundidade). */
  drawProps(ctx, sprites) {
    const list = this.props.filter(p => !p.dead).sort((a, b) => a.y - b.y);
    for (const p of list) p.draw(ctx, sprites);
  }
}
