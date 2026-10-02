/**
 * SpriteFactory.js — pre-renderiza TODOS os sprites em canvas de memoria.
 * Nada de asset externo: os draw*.js desenham cada frame uma unica vez;
 * durante o jogo so acontece drawImage (rapido) + versao branca para o flash.
 *
 * Uso:
 *   const sprites = new SpriteFactory(); sprites.build();
 *   sprites.draw(ctx, 'player', 'run', 3, x, y, { flip: true });
 */
import { PAL } from './Palette.js';
import { makeCanvas, ctx2d, outline } from './pxutil.js';
import { drawPlayer, PLAYER_ANIMS, PLAYER_PALETTE_TINT } from './drawPlayer.js';
import { drawEnemy, ENEMY_ANIMS } from './drawEnemies.js';
import { drawBoss, BOSS_ANIMS } from './drawBosses.js';
import { drawItem, ITEM_ANIMS } from './drawItems.js';
import { drawProp, PROP_ANIMS } from './drawProps.js';
import { tileFloor, tileCarpet, tileWall, tileSecret, tileDoor, tileExit, tileWallBase, tileDecal } from './drawTiles.js';

const CHAR_KEYS = ['max', 'bia', 'tonho', 'kiko', 'duda', 'ze'];

export class SpriteFactory {
  constructor(opts = {}) {
    this.canvasFactory = opts.canvasFactory || null;   // injecao p/ headless
    this.cache = new Map();      // "key" -> canvas
    this.white = new Map();      // "key" -> canvas branco (flash)
    this.meta = new Map();       // "key" -> {frames, dur}
    this.built = false;
    this.stats = { sprites: 0, frames: 0 };
  }

  /** Pre-renderiza tudo. Chamado uma vez no boot. */
  build() {
    if (this.built) return this;
    // player (6 personagens jogaveis, com tint de camisa)
    for (const id of CHAR_KEYS) {
      const tint = PLAYER_PALETTE_TINT[id];
      for (const [anim, def] of Object.entries(PLAYER_ANIMS)) {
        this._sheet(`player:${id}:${anim}`, 24, 24, def.frames, (ctx, f) =>
          drawPlayer(ctx, f, anim, { flip: false, ...(tint || {}) }), def.dur);
      }
    }
    // inimigos
    for (const [kind, anims] of Object.entries(ENEMY_ANIMS)) {
      const size = kind === 'burocrata' ? 24 : 16;
      for (const [anim, [frames, dur]] of Object.entries(anims)) {
        this._sheet(`enemy:${kind}:${anim}`, size, size, frames, (ctx, f) => drawEnemy(ctx, kind, f, anim), dur);
      }
    }
    // bosses
    for (const [id, def] of Object.entries(BOSS_ANIMS)) {
      for (const [anim, [frames, dur]] of Object.entries(def.anims)) {
        this._sheet(`boss:${id}:${anim}`, def.size, def.size, frames, (ctx, f) => drawBoss(ctx, id, f, anim), dur);
      }
    }
    // itens e projeteis
    for (const [kind, def] of Object.entries(ITEM_ANIMS)) {
      const size = kind === 'slide' ? 16 : 16;
      this._sheet(`item:${kind}`, size, size, def.frames, (ctx, f) => drawItem(ctx, kind, f), def.dur);
    }
    // tiles
    for (let v = 0; v < 3; v++) this._single(`tile:floor:${v}`, 16, 16, ctx => tileFloor(ctx, v));
    for (let v = 0; v < 2; v++) this._single(`tile:carpet:${v}`, 16, 16, ctx => tileCarpet(ctx, v));
    this._single('tile:wall', 16, 16, ctx => tileWall(ctx, false));
    this._single('tile:wallTop', 16, 16, ctx => tileWall(ctx, true));
    this._single('tile:wallBase', 16, 16, ctx => tileWallBase(ctx));
    this._single('tile:secret', 16, 16, ctx => tileSecret(ctx));
    this._sheet('tile:door', 16, 16, 2, (ctx, f) => tileDoor(ctx, false, f === 0), 0.4);
    this._sheet('tile:doorLocked', 16, 16, 2, (ctx, f) => tileDoor(ctx, true, f === 0), 0.4);
    this._sheet('tile:exit', 16, 16, 2, (ctx, f) => tileExit(ctx, f), 0.4);
    for (const d of ['stain', 'paper', 'tape', 'vent']) {
      this._sheet(`tile:decal:${d}`, 16, 16, 2, (ctx, f) => tileDecal(ctx, d, f), 0.5);
    }
    // props
    for (const [kind, def] of Object.entries(PROP_ANIMS)) {
      const [w, h] = PROP_SIZE[kind] || [16, 16];
      this._sheet(`prop:${kind}`, w, h, def.frames, (ctx, f) => drawProp(ctx, kind, f), def.dur);
    }
    // variantes extras de prop
    this._sheet('prop:desk_bare', 32, 16, 1, ctx => drawProp(ctx, 'desk', 0, { bare: true }), 1);
    this._sheet('prop:printer_broken', 16, 16, 4, (ctx, f) => drawProp(ctx, 'printer', f, { broken: true }), 0.2);
    this._sheet('prop:coffeemaker_used', 16, 24, 4, (ctx, f) => drawProp(ctx, 'coffeemaker', f, { used: true }), 0.2);
    this.built = true;
    return this;
  }

  _mk(w, h) {
    const c = makeCanvas(w, h, this.canvasFactory);
    c.width = w; c.height = h;
    return c;
  }

  _sheet(key, w, h, frames, painter, dur) {
    const list = [];
    for (let f = 0; f < frames; f++) {
      const c = this._mk(w, h);
      const ctx = ctx2d(c);
      painter(ctx, f);
      list.push(c);
    }
    const anim = key.split(':').pop();
    this.cache.set(key, list);
    this.meta.set(key, { frames, dur, w, h, anim });
    this.stats.sprites++; this.stats.frames += frames;
    return list;
  }

  _single(key, w, h, painter) { return this._sheet(key, w, h, 1, painter, 1); }

  /** Lista de canvases de uma animacao (ou null). */
  frames(key) { return this.cache.get(key) || null; }

  /** Canvas de um frame especifico. */
  get(key, frame = 0) {
    const list = this.cache.get(key);
    if (!list) return null;
    return list[((frame % list.length) + list.length) % list.length];
  }

  /** Metadados (frames, dur, w, h) de uma animacao. */
  info(key) { return this.meta.get(key) || null; }

  /** Frame index a partir do tempo decorrido (loop ou clamp). */
  frameAt(key, time, loop = true) {
    const m = this.meta.get(key);
    if (!m) return 0;
    const idx = Math.floor(time / m.dur);
    return loop ? ((idx % m.frames) + m.frames) % m.frames : Math.min(m.frames - 1, Math.max(0, idx));
  }

  /** Versao branca (flash de dano) — gerada sob demanda e cacheada. */
  _whiteOf(key, frame) {
    const ck = `${key}:${frame}`;
    let c = this.white.get(ck);
    if (c) return c;
    const src = this.get(key, frame);
    if (!src) return null;
    c = this._mk(src.width, src.height);
    const ctx = ctx2d(c);
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'source-over';
    this.white.set(ck, c);
    return c;
  }

  /** Versao contornada (usada em sprites de destaque, ex: itens de loja). */
  outlined(key, frame = 0, color = '#0b0b14') {
    const ck = `outline:${key}:${frame}:${color}`;
    let c = this.white.get(ck);
    if (c) return c;
    const src = this.get(key, frame);
    if (!src) return null;
    c = this._mk(src.width + 2, src.height + 2);
    const ctx = ctx2d(c);
    ctx.drawImage(src, 1, 1);
    outline(ctx, c.width, c.height, color);
    this.white.set(ck, c);
    return c;
  }

  /**
   * Desenha um sprite no contexto.
   * opts: { flip, alpha, scale, flash (0..1), rot, ox, oy }
   */
  draw(ctx, key, frame, x, y, opts = {}) {
    const list = this.cache.get(key);
    if (!list) return false;
    const f = ((frame % list.length) + list.length) % list.length;
    let img = list[f];
    const hardFlash = opts.flash && !opts.flashSoft;
    if (hardFlash) img = this._whiteOf(key, f) || img;
    const scale = opts.scale || 1;
    const w = img.width * scale, h = img.height * scale;
    const dx = Math.round(x - w / 2 + (opts.ox || 0));
    const dy = Math.round(y - h / 2 + (opts.oy || 0));
    const alpha = opts.alpha ?? 1;
    const needsSave = opts.flip || alpha < 1 || opts.rot;
    if (needsSave) {
      ctx.save();
      if (alpha < 1) ctx.globalAlpha = alpha;
      if (opts.rot) {
        ctx.translate(Math.round(x), Math.round(y));
        ctx.rotate(opts.rot);
        ctx.translate(-Math.round(x), -Math.round(y));
      }
      if (opts.flip) {
        ctx.translate(Math.round(x), 0);
        ctx.scale(-1, 1);
        ctx.translate(-Math.round(x), 0);
      }
    }
    ctx.drawImage(img, dx, dy, w, h);
    // flash suave: o sprite normal com uma camada branca por cima (melhor
    // para sprites grandes que ficariam "estouraados" no flash duro)
    if (opts.flashSoft && opts.flashSoft > 0) {
      const white = this._whiteOf(key, f);
      if (white) {
        ctx.save();
        ctx.globalAlpha = alpha * Math.min(1, opts.flashSoft);
        if (opts.flip) {
          ctx.translate(Math.round(x), 0);
          ctx.scale(-1, 1);
          ctx.translate(-Math.round(x), 0);
        }
        ctx.drawImage(white, dx, dy, w, h);
        ctx.restore();
      }
    }
    if (needsSave) ctx.restore();
    return true;
  }

  /** Desenha com o frame calculado pelo tempo (atalho). */
  drawAnim(ctx, key, time, x, y, opts = {}) {
    return this.draw(ctx, key, this.frameAt(key, time, opts.loop !== false), x, y, opts);
  }

  /**
   * Prancha de contato (ferramenta de inspecao): uma LINHA por animacao,
   * cada frame em sua propria celula. Bom para conferir o pixel art no PNG.
   */
  contactSheet(keys, cell = 32) {
    const maxFrames = keys.reduce((m, k) => Math.max(m, (this.cache.get(k) || []).length), 1);
    const c = this._mk(maxFrames * cell + 2, keys.length * cell + 2);
    const ctx = ctx2d(c);
    ctx.fillStyle = '#12121f';
    ctx.fillRect(0, 0, c.width, c.height);
    keys.forEach((key, row) => {
      const list = this.cache.get(key);
      if (!list) return;
      // linha alternada para separar visualmente
      if (row % 2) { ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, row * cell + 1, c.width, cell); }
      list.forEach((img, f) => {
        const ox = 1 + f * cell + ((cell - img.width) >> 1);
        const oy = 1 + row * cell + ((cell - img.height) >> 1);
        ctx.drawImage(img, ox, oy);
      });
    });
    return c;
  }
}

/** Tamanho em pixels de cada prop (mesas sao 2 tiles de largura). */
export const PROP_SIZE = {
  desk: [32, 16], chair: [16, 16], plant: [16, 16], printer: [16, 16],
  trash: [16, 16], frame: [16, 16], elevator: [32, 32], coffeemaker: [16, 24],
  vending: [16, 24], whiteboard: [16, 16], watercooler: [16, 24],
  server: [16, 28], speaker: [16, 16], projector: [16, 16],
};
