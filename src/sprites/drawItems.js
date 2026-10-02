/**
 * drawItems.js — pickups, projeteis e props de UI (16x16 cada).
 * Cafe 4 frames, clipe 3, toner 4, moeda 4, chave 2, coracao 2, bau 4.
 */
import { PAL, shade } from './Palette.js';
import { px, rect, hLine, pxCircle, pxEllipse, pxRing, pxLine, pxTri } from './pxutil.js';

const T = (ctx, x, y, w, h, c) => rect(ctx, x | 0, y | 0, w | 0, h | 0, c);
const D = (ctx, x, y, c) => px(ctx, x | 0, y | 0, c);

export const ITEM_ANIMS = {
  coffee: { frames: 4, dur: 0.18 }, clip: { frames: 3, dur: 0.12 },
  toner: { frames: 4, dur: 0.2 }, coin: { frames: 4, dur: 0.14 },
  key: { frames: 2, dur: 0.25 }, heart: { frames: 2, dur: 0.3 },
  chest: { frames: 4, dur: 0.2 }, badge: { frames: 2, dur: 0.3 },
  drive: { frames: 4, dur: 0.16 }, form: { frames: 2, dur: 0.3 },
  // projeteis
  staple: { frames: 1, dur: 0.1 }, paperball: { frames: 2, dur: 0.12 },
  pen: { frames: 1, dur: 0.1 }, number: { frames: 2, dur: 0.1 },
  soundwave: { frames: 2, dur: 0.1 }, bugproj: { frames: 2, dur: 0.08 },
  coffeeProj: { frames: 2, dur: 0.1 }, issue: { frames: 2, dur: 0.14 },
  slide: { frames: 2, dur: 0.12 }, ink: { frames: 1, dur: 0.1 },
  slash: { frames: 3, dur: 0.06 }, cable: { frames: 1, dur: 0.1 },
};

export function drawItem(ctx, kind, f, o = {}) {
  switch (kind) {
    case 'coffee': return coffee(ctx, f);
    case 'clip': return clip(ctx, f);
    case 'toner': return toner(ctx, f);
    case 'coin': return coin(ctx, f);
    case 'key': return key(ctx, f);
    case 'heart': return heart(ctx, f);
    case 'chest': return bau(ctx, f, o);
    case 'badge': return badge(ctx, f);
    case 'drive': return drive(ctx, f);
    case 'form': return form(ctx, f);
    case 'staple': return staple(ctx, o);
    case 'paperball': return paperball(ctx, f);
    case 'pen': return pen(ctx, f);
    case 'number': return number(ctx, f);
    case 'soundwave': return soundwave(ctx, f);
    case 'bugproj': return bugproj(ctx, f);
    case 'coffeeProj': return coffeeDrop(ctx, f);
    case 'issue': return issue(ctx, f);
    case 'slide': return slide(ctx, f);
    case 'ink': return ink(ctx);
    case 'slash': return slash(ctx, f);
    case 'cable': return cable(ctx, f);
    default: return coin(ctx, f);
  }
}

function coffee(ctx, f) {
  // brilho pulsando
  const glow = [0, 1, 2, 1][f % 4];
  pxCircle(ctx, 8, 8, 6 + (glow > 1 ? 1 : 0), '#e8e8f011');
  T(ctx, 5, 7, 7, 6, PAL.white);
  T(ctx, 5, 7, 7, 1, '#ffffff');
  T(ctx, 5, 12, 7, 1, PAL.paperShade);
  T(ctx, 11, 8, 2, 3, PAL.white);            // alca
  T(ctx, 6, 8, 5, 3, PAL.coffee);            // cafe dentro
  T(ctx, 6, 8, 5, 1, PAL.coffeeLight);
  // vapor
  for (let i = 0; i < 3; i++) {
    D(ctx, 5 + i * 3 + ((f + i) % 2), 4 - ((f + i) % 2), PAL.coffeeSteam);
    D(ctx, 5 + i * 3 + ((f + i + 1) % 2), 2 - ((f + i + 1) % 2), '#e8e8f088');
  }
  if (f % 2) { D(ctx, 3, 6, PAL.white); D(ctx, 13, 10, PAL.white); }
}

function clip(ctx, f) {
  const rot = f % 3;
  ctx.save(); ctx.translate(8, 8); ctx.rotate((rot * Math.PI) / 6); ctx.translate(-8, -8);
  T(ctx, 4, 6, 9, 1, PAL.steel);
  T(ctx, 4, 9, 9, 1, PAL.steel);
  T(ctx, 4, 6, 2, 4, PAL.white);
  T(ctx, 11, 6, 2, 4, PAL.white);
  T(ctx, 6, 7, 5, 2, '#8f8fa3');
  ctx.restore();
  if (f === 1) D(ctx, 13, 5, '#ffffff');
}

function toner(ctx, f) {
  const pulse = [0, 1, 2, 3][f % 4];
  T(ctx, 4, 6, 8, 8, PAL.toner);
  T(ctx, 4, 6, 8, 2, shade(PAL.toner, 40));
  T(ctx, 4, 12, 8, 2, shade(PAL.toner, -40));
  T(ctx, 6, 8, 4, 3, '#d1c4e9');
  hLine(ctx, 6, 9, 4, PAL.toner);
  pxRing(ctx, 8, 10, 6 + pulse, `#7e57c1${['33', '55', '77', '55'][pulse]}`);
  D(ctx, 3, 5 + pulse, '#d1c4e9'); D(ctx, 13, 14 - pulse, '#d1c4e9');
}

function coin(ctx, f) {
  const w = [7, 4, 1, 4][f % 4];
  pxEllipse(ctx, 8, 8, Math.max(1, w / 2), 6, PAL.coinGold);
  pxEllipse(ctx, 8, 8, Math.max(0, w / 2 - 2), 4, PAL.coinDark);
  if (w > 3) { hLine(ctx, 6, 8, 4, '#fff3b0'); }
  if (f % 2) D(ctx, 5, 5, '#fff8e1');
}

function key(ctx, f) {
  const glow = f % 2;
  T(ctx, 4, 7, 4, 4, PAL.keyGold);
  T(ctx, 5, 8, 2, 2, '#8d6e63');
  T(ctx, 8, 8, 5, 2, PAL.keyGold);
  T(ctx, 11, 10, 2, 2, PAL.keyGold);
  T(ctx, 9, 10, 1, 2, PAL.keyGold);
  if (glow) { D(ctx, 6, 4, '#fff8e1'); D(ctx, 11, 5, '#fff8e1'); }
}

function heart(ctx, f) {
  const s = f % 2;
  const w = 5 + s;
  pxEllipse(ctx, 8 - 2, 7, 3, 3, PAL.heart);
  pxEllipse(ctx, 8 + 2, 7, 3, 3, PAL.heart);
  pxTri(ctx, 3, 8, 13, 8, 8, 14, PAL.heart);
  pxEllipse(ctx, 7, 6, 1, 1, '#ffffff99');
  pxEllipse(ctx, 6, 8, 2, 2, PAL.heartDark);
  pxCircle(ctx, 8, 8, 3 + s, '#ef535011');
}

function bau(ctx, f, o) {
  const open = o.open ? 1 : 0;
  const lid = open ? 3 - Math.min(2, f) : 0;
  T(ctx, 2, 8, 12, 6, PAL.chest);
  T(ctx, 2, 8, 12, 1, '#a1887f');
  T(ctx, 2, 13, 12, 1, '#4e342e');
  T(ctx, 6, 8, 4, 4, PAL.chestMetal);
  D(ctx, 7, 10, '#4e342e');
  T(ctx, 2, 4 - lid, 12, 4, '#6d4c41');
  T(ctx, 2, 4 - lid, 12, 1, '#a1887f');
  if (open) {
    for (let i = 0; i < 3; i++) {
      const a = (f * 1.2 + i * 2.1);
      D(ctx, 8 + Math.cos(a) * 6, 6 + Math.sin(a) * 4, PAL.coinGold);
    }
    hLine(ctx, 4, 7, 8, '#ffe082');
  } else {
    T(ctx, 5, 3 - lid, 3, 3, '#8d6e63');
  }
}

function badge(ctx, f) {
  T(ctx, 5, 3, 6, 9, PAL.white);
  T(ctx, 5, 3, 6, 2, '#ffd54f');
  hLine(ctx, 6, 7, 4, '#9e9e9e');
  hLine(ctx, 6, 9, 4, '#9e9e9e');
  D(ctx, 8, 5, '#c62828');
  if (f % 2) D(ctx, 12, 6, '#fff8e1');
}

function drive(ctx, f) {
  const p = f % 4;
  T(ctx, 5, 4, 6, 9, PAL.coinGold);
  T(ctx, 6, 6, 4, 4, '#fff3b0');
  T(ctx, 7, 13, 2, 2, PAL.steel);
  pxRing(ctx, 8, 8, 5 + p, `#ffd54f${['33', '55', '77', '55'][p]}`);
  if (p % 2) D(ctx, 12, 4, '#ffffff');
}

function form(ctx, f) {
  T(ctx, 3, 4, 10, 8, PAL.paper);
  T(ctx, 3, 4, 10, 1, PAL.white);
  for (let i = 0; i < 3; i++) hLine(ctx, 4, 6 + i * 2, 8, PAL.paperLine);
  T(ctx, 9, 8, 3, 3, f % 2 ? '#c62828' : '#2e7d32');
}

// ---------------------------------------------------------------- projeteis
function staple(ctx, o) {
  const c = o.color || PAL.steel;
  T(ctx, 2, 3, 5, 1, c);
  T(ctx, 2, 4, 1, 2, c);
  T(ctx, 6, 4, 1, 2, c);
  D(ctx, 4, 6, c);
}

function paperball(ctx, f) {
  const c = ['#e8e8f0', '#d4d4e0'][f % 2];
  pxEllipse(ctx, 4, 4, 3, 3, c);
  D(ctx, 3, 3, PAL.paperLine); D(ctx, 5, 5, PAL.paperLine);
  pxLine(ctx, 6, 6, 8, 8, '#e8e8f088');
}

function pen(ctx, f) {
  const c = ['#1e88e5', '#e53935', '#43a047'][f % 3];
  T(ctx, 1, 3, 6, 2, c);
  T(ctx, 7, 3, 2, 2, '#37474f');
  T(ctx, 9, 3, 1, 2, PAL.steel);
  D(ctx, 2, 5, c);
}

function number(ctx, f) {
  const n = ['1', '2', '3', '4'][f % 4];
  T(ctx, 1, 2, 5, 6, PAL.white);
  T(ctx, 1, 2, 5, 1, '#81c784');
  const glyphs = {
    1: ['..X..', '.XX..', '..X..', '..X..', '..X..'],
    2: ['XXX..', '..X..', '.XX..', 'X....', 'XXXX.'],
    3: ['XXX..', '..X..', '.XX..', '..X..', 'XXX..'],
    4: ['X.X..', 'X.X..', 'XXX..', '..X..', '..X..'],
  };
  const g = glyphs[n];
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) if (g[y][x] === 'X') D(ctx, 1 + x, 3 + y, '#2e7d32');
  pxLine(ctx, 6, 4, 8, 6, PAL.coinGold);
}

function soundwave(ctx, f) {
  pxRing(ctx, 1, 5, 3 + f, '#81c784cc');
  pxRing(ctx, 1, 5, 5 + f, '#81c78488');
  pxRing(ctx, 1, 5, 7 + f, '#81c78444');
}

function bugproj(ctx, f) {
  const z = f % 2;
  T(ctx, 1, 2 + z, 4, 3, PAL.bug);
  D(ctx, 1, 1 + z, PAL.bugDark); D(ctx, 4, 1 + z, PAL.bugDark);
  D(ctx, 2, 3 + z, PAL.black); D(ctx, 4, 3 + z, PAL.black);
  pxLine(ctx, 1, 5 + z, 0, 7 + z, PAL.bugDark);
  pxLine(ctx, 5, 5 + z, 6, 7 + z, PAL.bugDark);
}

function coffeeDrop(ctx, f) {
  pxEllipse(ctx, 3, 4, 3, 2, PAL.coffee);
  pxEllipse(ctx, 3, 3, 2, 1, PAL.coffeeLight);
  D(ctx, 1, 2 - (f % 2), PAL.coffeeSteam);
  D(ctx, 5, 1, PAL.coffeeSteam);
}

function issue(ctx, f) {
  T(ctx, 1, 1, 6, 8, PAL.paper);
  T(ctx, 1, 1, 6, 1, '#ff8fa3');
  for (let i = 0; i < 4; i++) hLine(ctx, 2, 3 + i * 2, 4, PAL.paperLine);
  if (f % 2) D(ctx, 7, 4, '#ff8fa3');
}

function slide(ctx, f) {
  T(ctx, 0, 2, 12, 8, PAL.white);
  T(ctx, 0, 2, 12, 1, '#42a5f5');
  hLine(ctx, 2, 5, 8, '#ef5350');
  hLine(ctx, 2, 7, 6, '#90a4ae');
  hLine(ctx, 2, 9, 9, '#90a4ae');
  if (f % 2) hLine(ctx, 0, 4, 12, '#ffd54f');
}

function ink(ctx) {
  pxEllipse(ctx, 3, 3, 3, 2, PAL.particleInk);
  D(ctx, 5, 4, '#3f51b5aa');
}

function slash(ctx, f) {
  const a = [-4, 0, 4][f % 3];
  pxTri(ctx, 0, 8 + a, 14, 2 + a, 16, 10 + a, ['#ffffffcc', '#ffffff99', '#ffffff55'][f % 3]);
  hLine(ctx, 2, 9 + a, 10, PAL.white);
}

function cable(ctx, f) {
  for (let i = 0; i < 8; i++) D(ctx, i * 2, 4 + (i % 2) * 2 + (f % 2), '#546e7a');
  D(ctx, 14, 4, PAL.coinGold);
  D(ctx, 0, 6, PAL.coinGold);
}
