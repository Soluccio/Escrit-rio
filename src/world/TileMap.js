/**
 * TileMap.js — grade de tiles da sala, colisao AABB e desenho.
 * O piso/paredes estaticos sao pre-renderizados em UM canvas por sala
 * (uma unica blit por frame = FPS tranquilo no mobile).
 */
import { TILE, T, SOLID_TILES } from '../data/constants.js';
import { makeCanvas, ctx2d } from '../sprites/pxutil.js';

export class TileMap {
  constructor(cols, rows, floorTheme = null) {
    this.cols = cols; this.rows = rows;
    this.w = cols * TILE; this.h = rows * TILE;
    this.tiles = new Uint8Array(cols * rows);
    this.variants = new Uint8Array(cols * rows);   // variacao visual deterministica
    this.decals = [];                              // {x,y,kind} em px
    this.theme = floorTheme;
    this._static = null;                           // canvas cache do piso
    this._dirty = true;
  }

  idx(cx, cy) { return cy * this.cols + cx; }
  inBounds(cx, cy) { return cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows; }
  get(cx, cy) { return this.inBounds(cx, cy) ? this.tiles[this.idx(cx, cy)] : T.WALL; }
  set(cx, cy, t) { if (this.inBounds(cx, cy)) { this.tiles[this.idx(cx, cy)] = t; this._dirty = true; } }
  setVariant(cx, cy, v) { if (this.inBounds(cx, cy)) this.variants[this.idx(cx, cy)] = v; }
  getVariant(cx, cy) { return this.inBounds(cx, cy) ? this.variants[this.idx(cx, cy)] : 0; }

  isSolidTile(cx, cy) { return SOLID_TILES.has(this.get(cx, cy)); }
  isSolidAt(px, py) { return this.isSolidTile(Math.floor(px / TILE), Math.floor(py / TILE)); }

  /** Testa um AABB (em px de mundo) contra os tiles solidos. */
  boxHitsSolid(x, y, w, h) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.001) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.001) / TILE);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (this.isSolidTile(cx, cy)) return true;
      }
    }
    return false;
  }

  /** Quantos tiles solidos existem numa caixa (usado por props/explosoes). */
  solidCountIn(x, y, w, h) {
    let n = 0;
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.001) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.001) / TILE);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (this.isSolidTile(cx, cy)) n++;
    return n;
  }

  /** Celulas livres (chao) para spawnar inimigos/itens. */
  freeCells(margin = 2) {
    const out = [];
    for (let cy = margin; cy < this.rows - margin; cy++) {
      for (let cx = margin; cx < this.cols - margin; cx++) {
        if (!this.isSolidTile(cx, cy)) out.push({ cx, cy });
      }
    }
    return out;
  }

  /** Projeta a sala com borda de parede de 1 tile. */
  buildBox(floorKind = 'floor', variantRng = null) {
    for (let cy = 0; cy < this.rows; cy++) {
      for (let cx = 0; cx < this.cols; cx++) {
        const border = cx === 0 || cy === 0 || cx === this.cols - 1 || cy === this.rows - 1;
        if (border) this.set(cx, cy, T.WALL);
        else {
          const carpet = floorKind === 'carpet';
          this.set(cx, cy, carpet ? T.CARPET : (cx % 2 === cy % 2 ? T.FLOOR : T.FLOOR_ALT));
        }
        this.setVariant(cx, cy, variantRng ? variantRng.int(0, 2) : (cx * 7 + cy * 13) % 3);
      }
    }
    this._dirty = true;
  }

  /** Abre um vao de porta na parede indicada. */
  carveDoor(side, wide = 4, locked = false) {
    const t = locked ? T.DOOR_LOCKED : T.DOOR;
    const midX = Math.floor(this.cols / 2), midY = Math.floor(this.rows / 2);
    if (side === 'N') for (let i = 0; i < wide; i++) this.set(midX - (wide >> 1) + i, 0, t);
    if (side === 'S') for (let i = 0; i < wide; i++) this.set(midX - (wide >> 1) + i, this.rows - 1, t);
    if (side === 'W') for (let i = 0; i < wide; i++) this.set(0, midY - (wide >> 1) + i, t);
    if (side === 'E') for (let i = 0; i < wide; i++) this.set(this.cols - 1, midY - (wide >> 1) + i, t);
  }

  /** Posicao (em px) do centro de um vao de porta. */
  doorCenter(side) {
    const midX = Math.floor(this.cols / 2), midY = Math.floor(this.rows / 2);
    if (side === 'N') return { x: midX * TILE, y: TILE / 2 };
    if (side === 'S') return { x: midX * TILE, y: this.h - TILE / 2 };
    if (side === 'W') return { x: TILE / 2, y: midY * TILE };
    return { x: this.w - TILE / 2, y: midY * TILE };
  }

  addDecal(x, y, kind) { this.decals.push({ x, y, kind }); }

  /** Pre-renderiza piso + paredes num canvas unico. */
  prerender(sprites) {
    const c = makeCanvas(this.w, this.h);
    c.width = this.w; c.height = this.h;
    const ctx = ctx2d(c);
    for (let cy = 0; cy < this.rows; cy++) {
      for (let cx = 0; cx < this.cols; cx++) {
        const t = this.get(cx, cy), v = this.getVariant(cx, cy);
        const px = cx * TILE, py = cy * TILE;
        if (t === T.WALL || t === T.SECRET) {
          const topRow = cy + 1 < this.rows && !this.isSolidTile(cx, cy + 1);
          const key = t === T.SECRET ? 'tile:secret' : (topRow ? 'tile:wallTop' : 'tile:wall');
          sprites.draw(ctx, key, 0, px + TILE / 2, py + TILE / 2);
        } else if (t === T.CARPET) {
          sprites.draw(ctx, `tile:carpet:${v % 2}`, 0, px + TILE / 2, py + TILE / 2);
        } else {
          sprites.draw(ctx, `tile:floor:${v}`, 0, px + TILE / 2, py + TILE / 2);
        }
      }
    }
    for (const d of this.decals) sprites.draw(ctx, `tile:decal:${d.kind}`, 0, d.x, d.y);
    this._static = c;
    this._dirty = false;
    return c;
  }

  get staticCanvas() { return this._static; }

  /** Desenha piso pre-renderizado + portas animadas (dinamicas). */
  draw(ctx, sprites, time, view = null) {
    if (!this._static) this.prerender(sprites);
    if (view) {
      const sx = Math.max(0, Math.floor(view.x)), sy = Math.max(0, Math.floor(view.y));
      const sw = Math.min(this.w - sx, Math.ceil(view.w)), sh = Math.min(this.h - sy, Math.ceil(view.h));
      if (sw > 0 && sh > 0) ctx.drawImage(this._static, sx, sy, sw, sh, sx, sy, sw, sh);
    } else {
      ctx.drawImage(this._static, 0, 0);
    }
    // portas: anima abertura/fechamento
    const frame = Math.floor(time / 0.4) % 2;
    for (let cy = 0; cy < this.rows; cy++) {
      for (let cx = 0; cx < this.cols; cx++) {
        const t = this.get(cx, cy);
        if (t === T.DOOR) sprites.draw(ctx, 'tile:door', frame, cx * TILE + 8, cy * TILE + 8, { theme: this.theme });
        else if (t === T.DOOR_LOCKED) sprites.draw(ctx, 'tile:doorLocked', frame, cx * TILE + 8, cy * TILE + 8);
      }
    }
  }

  /** Debug: desenha a grade de colisao. */
  debugDraw(ctx) {
    ctx.fillStyle = '#ff000044';
    for (let cy = 0; cy < this.rows; cy++) {
      for (let cx = 0; cx < this.cols; cx++) {
        if (this.isSolidTile(cx, cy)) ctx.fillRect(cx * TILE, cy * TILE, TILE, TILE);
      }
    }
  }
}
