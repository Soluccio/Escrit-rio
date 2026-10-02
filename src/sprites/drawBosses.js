/**
 * drawBosses.js — 5 mini-bosses (40-48px) + CEO (64px).
 * Animacoes: idle 4, attack 4-5, phase2 3-5, phase3 5, stagger 2-3, death 6.
 */
import { PAL, shade } from './Palette.js';
import { px, rect, hLine, pxCircle, pxRing, pxEllipse, pxLine, pxTri } from './pxutil.js';

const T = (ctx, x, y, w, h, c) => rect(ctx, x | 0, y | 0, w | 0, h | 0, c);
const D = (ctx, x, y, c) => px(ctx, x | 0, y | 0, c);

export const BOSS_ANIMS = {
  recepcionista: { size: 40, anims: { idle: [4, 0.24], attack: [4, 0.12], phase2: [3, 0.14], stagger: [2, 0.2], death: [6, 0.18] } },
  vendedor:      { size: 42, anims: { idle: [4, 0.24], attack: [4, 0.12], phase2: [4, 0.14], stagger: [2, 0.2], death: [6, 0.18] } },
  entrevistadora:{ size: 40, anims: { idle: [4, 0.24], attack: [4, 0.12], phase2: [3, 0.14], stagger: [2, 0.2], death: [6, 0.18] } },
  gerente:       { size: 44, anims: { idle: [4, 0.24], attack: [4, 0.12], phase2: [4, 0.14], stagger: [2, 0.2], death: [6, 0.18] } },
  estagiarioTI:  { size: 40, anims: { idle: [4, 0.24], attack: [4, 0.12], phase2: [4, 0.14], stagger: [2, 0.2], death: [6, 0.18] } },
  ceo:           { size: 64, anims: { idle: [4, 0.26], attack: [5, 0.12], phase2: [5, 0.14], phase3: [5, 0.14], stagger: [3, 0.2], death: [6, 0.22] } },
};

export function drawBoss(ctx, id, f, anim, o = {}) {
  switch (id) {
    case 'recepcionista': return recepcionista(ctx, f, anim, o);
    case 'vendedor': return vendedor(ctx, f, anim, o);
    case 'entrevistadora': return entrevistadora(ctx, f, anim, o);
    case 'gerente': return gerente(ctx, f, anim, o);
    case 'estagiarioTI': return ti(ctx, f, anim, o);
    case 'ceo': return ceo(ctx, f, anim, o);
    default: return recepcionista(ctx, f, anim, o);
  }
}

// ------------------------------------------------------------ A RECEPCIONISTA
function recepcionista(ctx, f, anim, o) {
  const bob = anim === 'idle' ? [0, -1, 0, 1][f % 4] : 0;
  const spin = anim === 'phase2' ? f : 0;
  const y = 6 + bob;
  // cadeira giratoria
  pxEllipse(ctx, 20, 34, 10, 3, '#37474f');
  T(ctx, 19, 26, 2, 8, '#546e7a');
  if (anim === 'phase2') pxRing(ctx, 20, 30, 8 + spin * 2, PAL.paper);
  // corpo rosa (blazer)
  T(ctx, 14, y + 12, 12, 12, PAL.recep);
  T(ctx, 14, y + 12, 12, 2, shade(PAL.recep, 30));
  T(ctx, 14, y + 21, 12, 3, shade(PAL.recep, -40));
  // colar
  hLine(ctx, 16, y + 13, 8, '#ffd54f');
  // cabeca + cabelo
  T(ctx, 15, y, 10, 10, PAL.skin);
  T(ctx, 15, y, 10, 1, shade(PAL.skin, 20));
  T(ctx, 13, y - 2, 14, 4, '#4e342e');
  T(ctx, 13, y + 1, 3, 6, '#4e342e');
  T(ctx, 25, y + 1, 3, 6, '#4e342e');
  T(ctx, 15, y + 5, 10, 2, PAL.skinShade);
  // olhos + batom
  if (anim === 'stagger') { hLine(ctx, 17, y + 4, 2, PAL.black); hLine(ctx, 21, y + 4, 2, PAL.black); }
  else { D(ctx, 17, y + 4, PAL.black); D(ctx, 18, y + 4, PAL.black); D(ctx, 21, y + 4, PAL.black); D(ctx, 22, y + 4, PAL.black); }
  hLine(ctx, 18, y + 7, 4, '#e91e63');
  // bracos com caneta/agenda
  T(ctx, 10, y + 13, 4, 6, PAL.skin);
  T(ctx, 26, y + 13, 4, 6, PAL.skin);
  if (anim === 'attack') {
    T(ctx, 8, y + 10 - (f % 2), 6, 2, PAL.steel);
    T(ctx, 26, y + 10 + (f % 2), 6, 2, PAL.paper);
  } else {
    T(ctx, 26, y + 12, 5, 3, PAL.paper);
  }
  if (anim === 'death') { ctx.globalAlpha = 1 - f * 0.15; }
}

// --------------------------------------------------------- O VENDEDOR DO MES
function vendedor(ctx, f, anim, o) {
  const giant = anim === 'phase2' ? 1 : 0;
  const bob = anim === 'idle' ? [0, -1, 0, 1][f % 4] : 0;
  const s = giant ? 1.15 : 1;
  const chest = giant ? 1.5 : 1;
  const y = 6 + bob;
  // pernas
  T(ctx, 14, y + 24, 5, 10, '#263238');
  T(ctx, 22, y + 24, 5, 10, '#263238');
  T(ctx, 13, y + 32, 7, 3, PAL.black);
  T(ctx, 21, y + 32, 7, 3, PAL.black);
  // torso laranja (terno)
  T(ctx, 12, y + 10, 18 * chest, 15 * s, PAL.vendedor);
  T(ctx, 12, y + 10, 18 * chest, 2, shade(PAL.vendedor, 40));
  T(ctx, 12, y + 22 * s, 18 * chest, 3, shade(PAL.vendedor, -50));
  // camisa + gravata
  T(ctx, 20, y + 10, 4, 12, PAL.white);
  T(ctx, 21, y + 11, 2, 8, '#c62828');
  // cabeca
  T(ctx, 13, y, 14, 11, PAL.skin);
  T(ctx, 13, y, 14, 1, shade(PAL.skin, 20));
  T(ctx, 13, y - 1, 14, 2, '#212121');   // cabelo engomado
  T(ctx, 13, y + 7, 14, 3, PAL.skinShade);
  // sorriso de vendedor + olhos
  D(ctx, 16, y + 4, PAL.black); D(ctx, 17, y + 4, PAL.black);
  D(ctx, 22, y + 4, PAL.black); D(ctx, 23, y + 4, PAL.black);
  hLine(ctx, 17, y + 8, 6, PAL.black);
  T(ctx, 18, y + 8, 2, 1, PAL.white);
  // bracos: um apontando pra cima (meta batida!)
  T(ctx, 8, y + 12, 5, 8, PAL.vendedor);
  if (anim === 'attack' || anim === 'phase2') { T(ctx, 26, y + 4 - (f % 2) * 2, 4, 12, PAL.vendedor); D(ctx, 27, y + 2, PAL.skin); }
  else T(ctx, 26, y + 12, 5, 8, PAL.vendedor);
  // trofeu/planilha na mao
  if (anim === 'attack') {
    T(ctx, 6, y + 8, 6, 5, PAL.paper);
    hLine(ctx, 7, y + 9, 4, '#c62828');
  }
}

// ---------------------------------------------------------- A ENTREVISTADORA
function entrevistadora(ctx, f, anim, o) {
  const bob = anim === 'idle' ? [0, -1, 0, 1][f % 4] : 0;
  const y = 6 + bob;
  const shield = anim === 'phase2' || anim === 'attack';
  // saia longa
  T(ctx, 12, y + 18, 16, 14, PAL.entrevistadora);
  T(ctx, 12, y + 18, 16, 2, shade(PAL.entrevistadora, 35));
  T(ctx, 10, y + 30, 20, 3, shade(PAL.entrevistadora, -45));
  // blusa
  T(ctx, 14, y + 10, 12, 10, shade(PAL.entrevistadora, 20));
  T(ctx, 14, y + 10, 12, 1, PAL.white);
  // cracha
  T(ctx, 15, y + 13, 4, 3, PAL.white);
  hLine(ctx, 16, y + 14, 2, '#7e57c2');
  // cabeca
  T(ctx, 14, y, 12, 10, PAL.skin);
  T(ctx, 14, y + 6, 12, 3, PAL.skinShade);
  T(ctx, 12, y - 2, 16, 3, '#5d4037');
  T(ctx, 12, y + 1, 3, 8, '#5d4037');
  T(ctx, 25, y + 1, 3, 8, '#5d4037');
  // oculos
  T(ctx, 15, y + 3, 4, 3, '#37474f'); T(ctx, 16, y + 4, 2, 1, PAL.white);
  T(ctx, 21, y + 3, 4, 3, '#37474f'); T(ctx, 22, y + 4, 2, 1, PAL.white);
  hLine(ctx, 19, y + 4, 2, '#37474f');
  hLine(ctx, 17, y + 8, 6, PAL.black);
  // bracos + prancheta
  T(ctx, 9, y + 12, 5, 9, shade(PAL.entrevistadora, 20));
  T(ctx, 26, y + 12, 5, 9, shade(PAL.entrevistadora, 20));
  T(ctx, 24, y + 16, 8, 10, PAL.paper);
  for (let r = 0; r < 3; r++) hLine(ctx, 25, y + 18 + r * 2, 6, PAL.paperLine);
  if (shield) {                                     // escudo de papelada
    ctx.strokeStyle = '#e8e8f0cc'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(20, y + 14, 18, 0, Math.PI * 2); ctx.stroke();
  }
  if (anim === 'attack') {                           // perguntas no ar
    for (let i = 0; i < 3; i++) {
      const qx = 6 + i * 12, qy = y - 6 - ((f + i) % 2) * 3;
      T(ctx, qx, qy, 5, 7, PAL.paper);
      T(ctx, qx + 2, qy + 2, 1, 3, '#7e57c2');
      T(ctx, qx + 1, qy + 5, 1, 1, '#7e57c2');
      T(ctx, qx + 1, qy + 6, 2, 1, '#7e57c2');
    }
  }
}

// ------------------------------------------------------ O GERENTE DE PROJETOS
function gerente(ctx, f, anim, o) {
  const bob = anim === 'idle' ? [0, -1, 0, 1][f % 4] : 0;
  const y = 5 + bob;
  const present = anim === 'attack' || anim === 'phase2';
  // corpo cinza
  T(ctx, 12, y + 10, 20, 16, PAL.gerente);
  T(ctx, 12, y + 10, 20, 2, '#cfd8dc');
  T(ctx, 12, y + 23, 20, 3, '#607d8b');
  // camisa e gravata torta
  T(ctx, 20, y + 10, 5, 13, PAL.white);
  T(ctx, 21, y + 12, 3, 8, '#455a64');
  // cabeca calva + oculos
  T(ctx, 14, y, 16, 11, PAL.skin);
  T(ctx, 14, y, 16, 1, shade(PAL.skin, 15));
  T(ctx, 14, y + 8, 16, 3, PAL.skinShade);
  T(ctx, 13, y + 2, 5, 3, '#263238'); T(ctx, 14, y + 3, 3, 1, PAL.white);
  T(ctx, 22, y + 2, 5, 3, '#263238'); T(ctx, 23, y + 3, 3, 1, PAL.white);
  hLine(ctx, 18, y + 3, 4, '#263238');
  hLine(ctx, 17, y + 9, 8, shade(PAL.skin, -70));
  // prancheta / controle do projetor
  T(ctx, 6, y + 12, 6, 8, PAL.gerente);
  T(ctx, 4, y + 14, 5, 4, '#37474f');
  D(ctx, 5, y + 15, '#ff5252'); D(ctx, 6, y + 15, '#81c784');
  if (present) {
    T(ctx, 14, y + 34, 20, 3, '#37474f');          // base do projetor
    for (let i = 0; i < 4; i++) hLine(ctx, 6 + i * 8, y + 36, 3, '#546e7a');
    // feixe de slide
    ctx.fillStyle = '#ffd54f33';
    ctx.beginPath();
    ctx.moveTo(16, y + 34); ctx.lineTo(2 - (f % 2) * 2, y + 44); ctx.lineTo(34 + (f % 2) * 2, y + 44);
    ctx.closePath(); ctx.fill();
  }
  // tela de slide atras
  T(ctx, 6, y - 2, 26, 10, PAL.white);
  hLine(ctx, 6, y - 2, 26, PAL.paperShade);
  for (let i = 0; i < 3; i++) hLine(ctx, 8, y + i * 2, 18 - i * 4, ['#ef5350', '#42a5f5', '#66bb6a'][i]);
  hLine(ctx, 10, y + 7, 12, '#9e9e9e');
}

// ---------------------------------------------------------- O ESTAGIARIO DE TI
function ti(ctx, f, anim, o) {
  const float = anim === 'phase2' ? [0, -2, 0, 2][f % 4] : [0, -1][f % 2 === 0 ? 0 : 1];
  const y = 6 + (anim === 'idle' ? float : 0);
  // hoodie verde neon
  T(ctx, 11, y + 11, 15, 14, PAL.ti);
  T(ctx, 11, y + 11, 15, 2, shade(PAL.ti, 50));
  T(ctx, 11, y + 22, 15, 3, shade(PAL.ti, -60));
  // capuz
  T(ctx, 12, y, 13, 12, shade(PAL.ti, -30));
  T(ctx, 14, y + 2, 9, 8, '#1b1b26');
  // luz do rosto (monitor)
  T(ctx, 15, y + 4, 3, 1, PAL.ti); T(ctx, 20, y + 4, 3, 1, PAL.ti);
  // bracos com cabo
  T(ctx, 7, y + 13, 5, 8, shade(PAL.ti, -20));
  T(ctx, 25, y + 13, 5, 8, shade(PAL.ti, -20));
  pxLine(ctx, 4, y + 20, 9, y + 15, '#546e7a');
  pxLine(ctx, 27, y + 20, 32, y + 12 + (f % 2), '#546e7a');
  // bugs ao redor
  for (let i = 0; i < 3; i++) {
    const bx = 4 + i * 13, by = y - 4 + ((f + i) % 2) * 2;
    T(ctx, bx, by, 3, 2, PAL.bug);
    D(ctx, bx + 1, by - 1, PAL.bugDark);
  }
  if (anim === 'phase2') {                          // aura de virus gigante
    pxRing(ctx, 18, y + 14, 16 + (f % 2) * 2, '#00e67666');
    pxRing(ctx, 18, y + 14, 19 - (f % 2) * 2, '#00e67633');
  }
  if (anim === 'attack') {
    T(ctx, 28, y + 16, 8, 6, '#37474f');
    hLine(ctx, 29, y + 18, 6, PAL.ti);
  }
}

// ---------------------------------------------------------------- O CEO (64x64)
function ceo(ctx, f, anim, o) {
  const bob = anim === 'idle' ? [0, -1, 0, 1][f % 4] : 0;
  const y = 10 + bob;
  const phase3 = anim === 'phase3';
  const coat = phase3 ? '#c9a227' : PAL.ceo;

  // sombra
  pxEllipse(ctx, 32, 60, 16, 4, 'rgba(0,0,0,0.3)');

  // pernas + sapatos
  T(ctx, 24, y + 34, 8, 14, '#2b2b33');
  T(ctx, 34, y + 34, 8, 14, '#2b2b33');
  T(ctx, 22, y + 47, 11, 3, PAL.black);
  T(ctx, 33, y + 47, 11, 3, PAL.black);

  // capa de CEO
  const capeW = 48;
  T(ctx, 32 - capeW / 2, y + 12, capeW, 26, shade(coat, -35));
  T(ctx, 32 - capeW / 2, y + 12, capeW, 2, coat);

  // torso
  T(ctx, 18, y + 10, 28, 26, coat);
  T(ctx, 18, y + 10, 28, 3, shade(coat, 45));
  T(ctx, 18, y + 32, 28, 4, shade(coat, -55));
  // camisa + gravata dourada (colarinho fino)
  T(ctx, 29, y + 12, 6, 20, PAL.white);
  T(ctx, 28, y + 12, 8, 2, PAL.white);
  pxTri(ctx, 30, y + 15, 34, y + 15, 32, y + 30, '#ffb300');
  // lapelas do paleto
  pxLine(ctx, 28, y + 12, 30, y + 24, shade(coat, -25));
  pxLine(ctx, 36, y + 12, 34, y + 24, shade(coat, -25));
  // lenco no bolso
  T(ctx, 44, y + 20, 4, 3, PAL.white);

  // bracos
  T(ctx, 12, y + 14, 6, 18, coat);
  T(ctx, 46, y + 14, 6, 18, coat);
  T(ctx, 12, y + 30, 7, 5, PAL.skin);
  T(ctx, 45, y + 30, 7, 5, PAL.skin);
  if (anim === 'attack' || phase3) {                 // bracos erguidos
    T(ctx, 46, y + 2, 6, 16, coat);
    T(ctx, 47, y - 2, 6, 5, PAL.skin);
    if (anim === 'attack') { D(ctx, 50, y - 4 + (f % 2), '#ffd54f'); D(ctx, 48, y - 5, '#ffd54f'); }
  }

  // cabeca
  T(ctx, 22, y, 20, 14, PAL.skin);
  T(ctx, 22, y, 20, 2, shade(PAL.skin, 20));
  T(ctx, 22, y + 10, 20, 4, PAL.skinShade);
  // cabelo grisalho de CEO
  T(ctx, 20, y - 3, 24, 5, '#b0bec5');
  T(ctx, 20, y + 1, 4, 7, '#b0bec5');
  T(ctx, 40, y + 1, 4, 7, '#b0bec5');
  // sobrancelhas + olhos
  hLine(ctx, 25, y + 4, 5, '#8f8fa3');
  hLine(ctx, 34, y + 4, 5, '#8f8fa3');
  if (anim === 'stagger') { hLine(ctx, 25, y + 6, 5, PAL.black); hLine(ctx, 34, y + 6, 5, PAL.black); }
  else {
    T(ctx, 26, y + 6, 3, 2, phase3 ? '#ff5252' : PAL.black);
    T(ctx, 35, y + 6, 3, 2, phase3 ? '#ff5252' : PAL.black);
  }
  hLine(ctx, 28, y + 11, 8, shade(PAL.skin, -60));   // boca severa

  // aura de fase
  if (phase3) {
    pxRing(ctx, 32, y + 20, 26 + (f % 2) * 2, '#ffcf4d55');
    pxRing(ctx, 32, y + 20, 30 - (f % 2) * 2, '#ff525233');
  }
  if (anim === 'phase2') {                          // clones translucidos
    ctx.globalAlpha = 0.25;
    T(ctx, 2, y + 12, 14, 24, coat);
    T(ctx, 48, y + 12, 14, 24, coat);
    ctx.globalAlpha = 1;
  }
  if (anim === 'death') { ctx.globalAlpha = 1 - f * 0.13; }
}
