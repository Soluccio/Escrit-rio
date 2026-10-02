/**
 * drawTiles.js — tiles de 16x16 do escritorio (pisos, paredes, portas, elevador).
 * O piso é desenhado com variacao sutil e deterministica (dois variantes + carpete).
 */
import { PAL, shade } from './Palette.js';
import { px, rect, hLine, pxLine } from './pxutil.js';

const T = (ctx, x, y, w, h, c) => rect(ctx, x | 0, y | 0, w | 0, h | 0, c);
const D = (ctx, x, y, c) => px(ctx, x | 0, y | 0, c);

/** Piso de escritorio com placas de vinil sutil. */
export function tileFloor(ctx, v = 0, theme = null) {
  const base = theme?.floor || PAL.floor;
  T(ctx, 0, 0, 16, 16, base);
  T(ctx, 0, 0, 16, 1, shade(base, 6));
  T(ctx, 0, 15, 16, 1, shade(base, -10));
  // juntas do piso
  hLine(ctx, 0, 8, 16, shade(base, -8));
  pxLine(ctx, 0, 0, 0, 15, shade(base, -8));
  if (v === 1) {
    D(ctx, 5, 4, shade(base, -12)); D(ctx, 11, 11, shade(base, -14));
    D(ctx, 3, 13, shade(base, -10));
  } else if (v === 2) {
    // marcas de cadeira / arranhao
    pxLine(ctx, 9, 3, 12, 6, shade(base, -14));
    D(ctx, 7, 12, shade(base, -12));
  }
}

/** Carpete (corredor/arena) com textura de pontos. */
export function tileCarpet(ctx, v = 0, theme = null) {
  const base = theme?.carpet || PAL.carpet;
  T(ctx, 0, 0, 16, 16, base);
  const dot = shade(base, 10), dot2 = shade(base, -8);
  for (let y = 2; y < 16; y += 4) {
    for (let x = (y % 8 === 2 ? 2 : 4); x < 16; x += 4) D(ctx, x, y, dot);
  }
  for (let y = 4; y < 16; y += 8) for (let x = 2; x < 16; x += 8) D(ctx, x, y, dot2);
  hLine(ctx, 0, 0, 16, shade(base, 4));
  if (v === 1) { D(ctx, 7, 7, dot2); D(ctx, 9, 9, dot2); }
}

/** Parede — bloco superior (topo) e frente. */
export function tileWall(ctx, top, theme = null) {
  const w = theme?.wall || PAL.wall;
  if (top) {
    T(ctx, 0, 0, 16, 16, shade(w, 12));
    T(ctx, 0, 0, 16, 3, shade(w, 26));
    T(ctx, 0, 13, 16, 3, shade(w, -10));
  } else {
    T(ctx, 0, 0, 16, 16, w);
    // textura de blocos de drywall
    hLine(ctx, 0, 0, 16, shade(w, 18));
    hLine(ctx, 0, 7, 16, shade(w, -18));
    hLine(ctx, 0, 15, 16, shade(w, -24));
    pxLine(ctx, 7, 0, 7, 7, shade(w, -18));
    pxLine(ctx, 3, 8, 3, 15, shade(w, -18));
    pxLine(ctx, 12, 8, 12, 15, shade(w, -18));
  }
}

/** Parede destrutivel (sala secreta): rachaduras visiveis. */
export function tileSecret(ctx, theme = null) {
  const w = theme?.wall || PAL.wall;
  T(ctx, 0, 0, 16, 16, shade(w, -6));
  pxLine(ctx, 2, 1, 5, 6, '#2b2b3d');
  pxLine(ctx, 5, 6, 3, 11, '#2b2b3d');
  pxLine(ctx, 3, 11, 7, 15, '#2b2b3d');
  pxLine(ctx, 9, 0, 12, 5, '#2b2b3d');
  pxLine(ctx, 12, 5, 10, 9, '#2b2b3d');
  hLine(ctx, 0, 0, 16, shade(w, 10));
  D(ctx, 6, 3, shade(w, 30)); D(ctx, 11, 13, shade(w, 30));
}

/** Porta (aberta = passavel; trancada = solida com barra). */
export function tileDoor(ctx, locked, horizontal = false, theme = null) {
  const accent = theme?.accent || PAL.door;
  T(ctx, 0, 0, 16, 16, '#2b2b3d');
  if (horizontal) {
    T(ctx, 0, 0, 16, 4, PAL.wall); T(ctx, 0, 12, 16, 4, PAL.wall);
    if (locked) {
      T(ctx, 1, 5, 14, 6, PAL.doorLocked);
      hLine(ctx, 1, 5, 14, shade(PAL.doorLocked, 30));
      T(ctx, 7, 5, 2, 6, accent);
      D(ctx, 4, 7, PAL.steel); D(ctx, 11, 7, PAL.steel);
    } else {
      T(ctx, 1, 5, 6, 6, PAL.door); T(ctx, 9, 5, 6, 6, PAL.door);
      hLine(ctx, 1, 5, 6, shade(PAL.door, 25)); hLine(ctx, 9, 5, 6, shade(PAL.door, 25));
      T(ctx, 0, 5, 1, 6, PAL.steel); T(ctx, 15, 5, 1, 6, PAL.steel);
    }
  } else {
    T(ctx, 0, 0, 4, 16, PAL.wall); T(ctx, 12, 0, 4, 16, PAL.wall);
    if (locked) {
      T(ctx, 5, 1, 6, 14, PAL.doorLocked);
      pxLine(ctx, 5, 1, 5, 15, shade(PAL.doorLocked, 25));
      T(ctx, 7, 7, 2, 3, accent);
      D(ctx, 7, 4, PAL.steel); D(ctx, 7, 12, PAL.steel);
    } else {
      T(ctx, 5, 1, 6, 7, PAL.door); T(ctx, 5, 9, 6, 6, PAL.door);
      pxLine(ctx, 5, 1, 5, 15, shade(PAL.door, 25));
      hLine(ctx, 5, 1, 6, PAL.steel); hLine(ctx, 5, 15, 6, PAL.steel);
    }
  }
}

/** Elevador / saida do andar. */
export function tileExit(ctx, f = 0, theme = null) {
  T(ctx, 0, 0, 16, 16, '#37474f');
  T(ctx, 2, 1, 12, 14, PAL.steel);
  T(ctx, 3, 2, 10, 12, shade(PAL.steel, -20));
  // portas que abrem e fecham
  const gap = f % 2 === 0 ? 1 : 3;
  T(ctx, 3, 2, 5 - gap, 12, '#cfd8dc');
  T(ctx, 8 + gap, 2, 5 - gap, 12, '#cfd8dc');
  pxLine(ctx, 7, 2, 7, 13, '#37474f');
  // indicador de andar
  T(ctx, 4, 3, 8, 3, '#263238');
  hLine(ctx, 5, 4, 6, theme?.accent || PAL.exit);
  hLine(ctx, 4, 14, 8, PAL.wallTop);
}

/** Tile de parede com rodape (base) usado nas bordas internas. */
export function tileWallBase(ctx, theme = null) {
  const w = theme?.wall || PAL.wall;
  T(ctx, 0, 0, 16, 16, w);
  hLine(ctx, 0, 0, 16, shade(w, 16));
  T(ctx, 0, 12, 16, 4, shade(w, -25));
  hLine(ctx, 0, 12, 16, shade(w, -45));
  // rodape
  D(ctx, 4, 6, shade(w, -20)); D(ctx, 12, 8, shade(w, -20));
}

/** Decoracao de piso: mancha de cafe, papel amassado, fita de obra. */
export function tileDecal(ctx, kind, v = 0) {
  if (kind === 'stain') {
    ctx.fillStyle = 'rgba(93,64,55,0.35)';
    ctx.beginPath(); ctx.ellipse(8, 8, 4 + (v % 2), 3, 0.4, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'paper') {
    T(ctx, 4, 6, 6, 5, PAL.paperShade);
    hLine(ctx, 5, 8, 4, PAL.paperLine);
    D(ctx, 10, 11, PAL.paperShade);
  } else if (kind === 'tape') {
    T(ctx, 1, 7, 14, 3, '#ffd54f88');
    hLine(ctx, 1, 7, 14, '#ffd54fcc');
  } else if (kind === 'vent') {
    T(ctx, 3, 3, 10, 10, '#4a4a5a');
    for (let i = 0; i < 4; i++) hLine(ctx, 4, 5 + i * 2, 8, '#37474f');
    hLine(ctx, 3, 3, 10, '#5a5a6b');
  }
}
