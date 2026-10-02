/**
 * drawEnemies.js — os 10 inimigos comuns, cada um com sua animacao.
 *
 * A arte e desenhada em coordenadas de 16x16 (burocrata 24x24) e o
 * SpriteFactory amplia em ENEMY_ART.scale (1.5x) ao gerar o sprite final, com
 * vizinho-mais-proximo: os bichos ficam 24x24 / 36x36 sem perder o pixel art.
 * Todo bicho tem hurt de 1 frame (flash branco e aplicado no render).
 */
import { PAL, shade } from './Palette.js';
import { px, rect, hLine, pxCircle, pxRing, pxMap, pxEllipse, pxLine } from './pxutil.js';

/** Metadados de animacao por inimigo: frames + duracao. */
export const ENEMY_ANIMS = {
  papel:       { idle: [2, 0.35], walk: [4, 0.14], attack: [2, 0.10], hurt: [1, 0.2] },
  grampeador:  { idle: [2, 0.4],  hop: [3, 0.16],  attack: [2, 0.09], hurt: [1, 0.2] },
  telefone:    { idle: [4, 0.22], attack: [2, 0.12], hurt: [1, 0.2] },
  planilha:    { idle: [2, 0.4],  attack: [3, 0.12], hurt: [1, 0.2] },
  formulario:  { idle: [2, 0.35], split: [2, 0.12], hurt: [1, 0.2] },
  burocrata:   { idle: [4, 0.25], walk: [3, 0.2],  shield: [2, 0.2], hurt: [1, 0.2] },
  bug:         { idle: [2, 0.16], swarm: [4, 0.07], attack: [1, 0.1], hurt: [1, 0.15] },
  cafe:        { idle: [4, 0.3],  attack: [2, 0.15], hurt: [1, 0.2] },
  cabo:        { idle: [2, 0.35], wrap: [3, 0.14], hurt: [1, 0.2] },
  fantasma:    { idle: [2, 0.3],  fade: [3, 0.16], attack: [2, 0.12], hurt: [1, 0.2] },
};

/** Tamanhos da arte e fator de ampliacao usado na pre-renderizacao. */
export const ENEMY_ART = {
  small: 16,      // canvas da arte da maioria
  big: 24,        // canvas da arte do burocrata
  scale: 1.5,     // 16 -> 24, 24 -> 36 (ver SpriteFactory)
};

const T = (ctx, x, y, w, h, c) => rect(ctx, x | 0, y | 0, w | 0, h | 0, c);
const D = (ctx, x, y, c) => px(ctx, x | 0, y | 0, c);

/** Desenha um frame de um inimigo comum no canvas (16x16 ou 24x24). */
export function drawEnemy(ctx, kind, f, anim, o = {}) {
  switch (kind) {
    case 'papel': return papel(ctx, f, anim, o);
    case 'grampeador': return grampeador(ctx, f, anim, o);
    case 'telefone': return telefone(ctx, f, anim, o);
    case 'planilha': return planilha(ctx, f, anim, o);
    case 'formulario': return formulario(ctx, f, anim, o);
    case 'burocrata': return burocrata(ctx, f, anim, o);
    case 'bug': return bug(ctx, f, anim, o);
    case 'cafe': return cafe(ctx, f, anim, o);
    case 'cabo': return cabo(ctx, f, anim, o);
    case 'fantasma': return fantasma(ctx, f, anim, o);
    default: return papel(ctx, f, anim, o);
  }
}

// ------------------------------------------------------------------ PAPEL
function papel(ctx, f, anim, o) {
  const yy = anim === 'walk' ? [0, -1, 0, 1][f % 4] : (anim === 'idle' ? [0, -1][f % 2] : 0);
  const wob = anim === 'walk' ? [1, 0, -1, 0][f % 4] : 0;
  // pilha de folhas
  T(ctx, 3, 6 + yy, 10, 7, PAL.paper);
  T(ctx, 3, 6 + yy, 10, 1, PAL.white);
  T(ctx, 2 + wob, 8 + yy, 12, 5, PAL.paperShade);
  T(ctx, 3, 9 + yy, 10, 1, PAL.paperLine);
  T(ctx, 4, 11 + yy, 8, 1, PAL.paperLine);
  T(ctx, 3, 13 + yy, 10, 1, '#a8a8bd');
  if (anim === 'attack') {
    for (let i = 0; i < 3; i++) T(ctx, 4 + i * 4, 4 + yy + (f % 2), 3, 3, PAL.paper);
    T(ctx, 5, 5, 6, 1, PAL.paperLine);
  }
  // olhinhos
  D(ctx, 5, 9 + yy, PAL.black); D(ctx, 5, 10 + yy, PAL.black);
  D(ctx, 9, 9 + yy, PAL.black); D(ctx, 9, 10 + yy, PAL.black);
  hLine(ctx, 6, 11 + yy, 3, '#c62828');
}

// ------------------------------------------------------------- GRAMPEADOR
function grampeador(ctx, f, anim, o) {
  const hop = anim === 'hop' ? [0, -3, -1][f % 3] : (anim === 'idle' ? [0, -1][f % 2] : 0);
  const open = anim === 'attack' ? (f === 0 ? 0 : 3) : 0;
  T(ctx, 2, 8 + hop, 12, 5, PAL.steel);
  T(ctx, 2, 8 + hop, 12, 1, PAL.white);
  T(ctx, 2, 12 + hop, 12, 1, PAL.steelShade);
  T(ctx, 4, 4 + hop - open, 8, 4, PAL.steelShade);           // cabeca/topo
  T(ctx, 5, 3 + hop - open, 6, 2, PAL.wood);
  T(ctx, 3, 9 + hop, 2, 3, PAL.steelShade);
  D(ctx, 6, 10 + hop, PAL.black); D(ctx, 9, 10 + hop, PAL.black);
  if (anim === 'attack' && f === 1) {                         // grampo voando
    T(ctx, 14, 10, 2, 1, PAL.steel);
    T(ctx, 1, 9, 2, 1, PAL.steel);
  }
}

// ---------------------------------------------------------------- TELEFONE
function telefone(ctx, f, anim, o) {
  const ring = anim === 'attack' ? 1 : 0;
  const shake = anim === 'attack' ? (f % 2 ? 1 : -1) : (anim === 'idle' && f % 2 ? 1 : 0);
  T(ctx, 3 + shake, 6, 10, 9, PAL.phoneBody);
  T(ctx, 3 + shake, 6, 10, 1, '#4e626b');
  T(ctx, 4 + shake, 8, 8, 4, PAL.screen);
  T(ctx, 5 + shake, 9, 3, 1, '#1b3b1e');
  hLine(ctx, 5 + shake, 11, 5, '#1b3b1e');
  if (ring || anim === 'idle') {
    // fone em cima, balancando
    const tilt = anim === 'idle' ? (f < 2 ? 0 : 1) : (f % 2);
    T(ctx, 2 + shake + tilt, 3, 12, 3, PAL.phoneShade);
    T(ctx, 2 + shake + tilt, 3, 3, 3, PAL.steelShade);
    T(ctx, 11 + shake + tilt, 3, 3, 3, PAL.steelShade);
  }
  if (anim === 'attack') {                                    // ondas sonoras
    for (let i = 0; i < 2; i++) {
      pxRing(ctx, 8 + shake, 10, 6 + i * 3 + (f % 2), '#81c78488');
    }
  }
}

// ---------------------------------------------------------------- PLANILHA
function planilha(ctx, f, anim, o) {
  const lift = anim === 'attack' ? [0, -2, -3][f % 3] : (anim === 'idle' ? [0, -1][f % 2] : 0);
  T(ctx, 3, 3 + lift, 10, 11, PAL.white);
  T(ctx, 3, 3 + lift, 10, 1, PAL.paperShade);
  for (let r = 0; r < 4; r++) hLine(ctx, 4, 5 + r * 2 + lift, 8, '#c3c3d4');
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) D(ctx, 5 + c * 3, 5 + r * 2 + lift, ['#81c784', '#ffd54f', '#ef5350'][(c + r) % 3]);
  }
  if (anim === 'attack') {
    for (let i = 0; i < 3; i++) D(ctx, 14 - i, 6 + i * 2 + lift, PAL.coinGold);
  }
  D(ctx, 5, 13 + lift, PAL.black); D(ctx, 10, 13 + lift, PAL.black);
}

// -------------------------------------------------------------- FORMULARIO
function formulario(ctx, f, anim, o) {
  const sq = anim === 'split' ? [0, 1, 2][f % 3] : 0;
  const yy = anim === 'idle' ? [0, -1][f % 2] : 0;
  T(ctx, 3 - sq, 4 + yy - sq, 9, 10, PAL.paper);
  T(ctx, 3 - sq, 4 + yy - sq, 9, 1, PAL.white);
  for (let r = 0; r < 4; r++) hLine(ctx, 4 - sq, 6 + r * 2 + yy - sq, 7, PAL.paperLine);
  T(ctx, 8 - sq, 12 + yy - sq, 3, 3, '#c62828');   // carimbo
  if (anim === 'split') {                           // copias se separando
    T(ctx, 12 + sq, 6 + yy, 4, 5, PAL.paperShade);
    T(ctx, 1 - sq, 8 + yy, 4, 5, PAL.paperShade);
  }
  D(ctx, 5, 7 + yy, PAL.black); D(ctx, 9, 7 + yy, PAL.black);
}

// ---------------------------------------------------------------- BUROCRATA
function burocrata(ctx, f, anim, o) {
  const step = anim === 'walk' ? (f === 0 ? 0 : f === 1 ? -1 : 1) : 0;
  const yy = anim === 'idle' ? [0, 0, -1, 0][f % 4] : 0;
  // corpo social cinza-azulado
  T(ctx, 5, 8 + yy, 14, 12, '#78909c');
  T(ctx, 5, 8 + yy, 14, 2, '#b0bec5');
  T(ctx, 5, 17 + yy, 14, 3, '#546e7a');
  T(ctx, 4, 9 + yy + step, 3, 8, '#90a4ae');  // bracos
  T(ctx, 17, 9 + yy - step, 3, 8, '#90a4ae');
  // cabeca careca
  T(ctx, 7, 2 + yy, 10, 7, PAL.skin);
  T(ctx, 7, 2 + yy, 10, 1, shade(PAL.skin, 15));
  T(ctx, 7, 7 + yy, 10, 2, PAL.skinShade);
  D(ctx, 9, 5 + yy, PAL.black); D(ctx, 14, 5 + yy, PAL.black);
  hLine(ctx, 10, 8 + yy, 4, shade(PAL.skin, -70));
  // gravata discreta + cracha
  T(ctx, 11, 10 + yy, 2, 6, '#263238');
  T(ctx, 16, 11 + yy, 3, 2, PAL.white);
  // escudo de papelada
  if (anim === 'shield') {
    const a = f === 0 ? 0.9 : 0.6;
    ctx.fillStyle = `rgba(232,232,240,${a})`;
    ctx.beginPath();
    ctx.arc(12, 12 + yy, 14, -Math.PI, Math.PI);
    ctx.fill();
  }
}

// --------------------------------------------------------------------- BUG
function bug(ctx, f, anim, o) {
  const zz = anim === 'swarm' ? [0, -1, 0, 1][f % 4] : 0;
  const wig = anim === 'swarm' ? [-1, 0, 1, 0][f % 4] : 0;
  const bounce = anim === 'idle' ? [0, -1][f % 2] : 0;
  // patinhas
  for (let i = 0; i < 3; i++) {
    pxLine(ctx, 4 + i * 3, 11 + zz, 2 + i * 3 + wig, 14 + zz, PAL.bugDark);
    pxLine(ctx, 12 - i * 3, 11 + zz, 14 - i * 3 - wig, 14 + zz, PAL.bugDark);
  }
  pxEllipse(ctx, 8, 8 + zz + bounce, 5, 4, PAL.bug);
  hLine(ctx, 4, 8 + zz + bounce, 9, '#a8f5ea');
  pxEllipse(ctx, 8, 7 + zz + bounce, 3, 2, '#c9fff8');
  // antenas
  pxLine(ctx, 6, 5 + zz, 4, 2 + zz, PAL.bugDark);
  pxLine(ctx, 10, 5 + zz, 12, 2 + zz, PAL.bugDark);
  D(ctx, 4, 1 + zz, PAL.bug); D(ctx, 12, 1 + zz, PAL.bug);
  // olhos
  D(ctx, 6, 7 + zz + bounce, PAL.black); D(ctx, 10, 7 + zz + bounce, PAL.black);
  if (anim === 'attack') { D(ctx, 8, 12 + zz, '#ff5252'); D(ctx, 7, 13 + zz, '#ff5252'); }
}

// -------------------------------------------------------------------- CAFE
function cafe(ctx, f, anim, o) {
  const spread = anim === 'idle' ? [0, 1, 2, 1][f % 4] : 2;
  const rx = 5 + spread, ry = 3 + (spread >> 1);
  pxEllipse(ctx, 8, 12, rx, ry, PAL.coffee);
  pxEllipse(ctx, 8, 11, rx - 1, ry - 1, PAL.coffeeLight);
  // borbulhas
  const bub = anim === 'attack' ? 3 : 2;
  for (let i = 0; i < bub; i++) {
    const bx = 4 + ((f * 3 + i * 5) % 9);
    D(ctx, bx, 10 - ((f + i) % 2), PAL.coffeeSteam);
  }
  if (anim === 'attack') {
    for (let i = 0; i < 3; i++) D(ctx, 3 + i * 5, 6 - (f % 2) * 2, PAL.coffeeLight);
  }
  D(ctx, 6, 11, PAL.black); D(ctx, 10, 11, PAL.black);  // olhinhos na poça
}

// --------------------------------------------------------------- CABO
function cabo(ctx, f, anim, o) {
  const t = anim === 'wrap' ? f : 0;
  const wob = anim === 'idle' ? [0, 1][f % 2] : 0;
  // novelo emaranhado
  pxCircle(ctx, 8, 9 + wob, 6, '#37474f');
  pxCircle(ctx, 8, 9 + wob, 5, '#546e7a');
  pxCircle(ctx, 8, 9 + wob, 3, '#263238');
  pxRing(ctx, 8, 9 + wob, 4, '#cfd8dc');
  pxLine(ctx, 2, 12 + wob, 5, 6 + wob, '#78909c');
  pxLine(ctx, 13, 6 + wob, 15, 2 + wob, '#78909c');
  // plugues brilhando
  D(ctx, 15, 2 + wob, PAL.coinGold);
  D(ctx, 2, 13 + wob, PAL.coinGold);
  if (anim === 'wrap') {
    pxRing(ctx, 8, 9, 7 + t, '#00e676aa');
    pxRing(ctx, 8, 9, 9 + t, '#00e67666');
  }
  D(ctx, 6, 8 + wob, '#ff1744'); D(ctx, 10, 8 + wob, '#ff1744');
}

// ----------------------------------------------------------- ESTAGIARIO FANTASMA
function fantasma(ctx, f, anim, o) {
  const alpha = anim === 'fade' ? [0.25, 0.6, 1][f % 3] : 0.75;
  const bob = anim === 'idle' ? [0, -2][f % 2] : (anim === 'attack' ? -1 : 0);
  ctx.save();
  ctx.globalAlpha = alpha;
  // corpo flutuante com barra de saia ondulada
  const baseY = 4 + bob;
  T(ctx, 4, baseY, 9, 9, '#dce7ff');
  T(ctx, 4, baseY, 9, 1, PAL.white);
  for (let i = 0; i < 5; i++) {
    const off = anim === 'idle' ? ((f + i) % 2) : ((f + i) % 3 === 0 ? 1 : 0);
    T(ctx, 4 + i * 2, baseY + 9, 2, 1 + off, '#c3d3f0');
  }
  // olhos vazios
  T(ctx, 6, baseY + 3, 2, 2, '#2b2b3d');
  T(ctx, 9, baseY + 3, 2, 2, '#2b2b3d');
  hLine(ctx, 6, baseY + 7, 5, '#2b2b3d');
  // cracha flutuando
  T(ctx, 12, baseY + 4, 3, 4, '#8f8fa3');
  ctx.restore();
  if (anim === 'attack') {
    pxRing(ctx, 8, baseY + 5, 7, '#dce7ff66');
  }
}
