/**
 * drawProps.js — moveis e obstaculos (mesas, cadeiras, plantas, impressoras...).
 * Cada prop tem sprite proprio e tamanho em pixels definido em Prop.js.
 */
import { PAL, shade } from './Palette.js';
import { px, rect, box, hLine, pxCircle, pxEllipse, pxLine } from './pxutil.js';

const T = (ctx, x, y, w, h, c) => rect(ctx, x | 0, y | 0, w | 0, h | 0, c);
const D = (ctx, x, y, c) => px(ctx, x | 0, y | 0, c);

export const PROP_ANIMS = {
  desk: { frames: 1, dur: 1 }, chair: { frames: 2, dur: 0.4 }, plant: { frames: 2, dur: 0.5 },
  printer: { frames: 4, dur: 0.2 }, trash: { frames: 1, dur: 1 }, frame: { frames: 2, dur: 0.5 },
  elevator: { frames: 4, dur: 0.25 }, coffeemaker: { frames: 4, dur: 0.2 },
  vending: { frames: 4, dur: 0.3 }, whiteboard: { frames: 1, dur: 1 },
  watercooler: { frames: 2, dur: 0.5 }, server: { frames: 4, dur: 0.2 },
  speaker: { frames: 2, dur: 0.4 }, projector: { frames: 2, dur: 0.5 },
};

export function drawProp(ctx, kind, f = 0, o = {}) {
  switch (kind) {
    case 'desk': return desk(ctx, o);
    case 'chair': return chair(ctx, f, o);
    case 'plant': return plant(ctx, f);
    case 'printer': return printer(ctx, f, o);
    case 'trash': return trash(ctx);
    case 'frame': return picture(ctx, f);
    case 'elevator': return elevator(ctx, f);
    case 'coffeemaker': return coffeemaker(ctx, f, o);
    case 'vending': return vending(ctx, f);
    case 'whiteboard': return whiteboard(ctx);
    case 'watercooler': return watercooler(ctx, f);
    case 'server': return server(ctx, f);
    case 'speaker': return speaker(ctx, f);
    case 'projector': return projector(ctx, f);
    default: return desk(ctx, o);
  }
}

/** Mesa de escritorio 32x16 (2 tiles de largura). */
function desk(ctx, o = {}) {
  const w = 32;
  T(ctx, 0, 2, w, 9, '#a1887f');
  T(ctx, 0, 2, w, 2, '#c8a27c');
  T(ctx, 0, 10, w, 2, '#6d4c41');
  T(ctx, 1, 12, 3, 4, '#4e342e'); T(ctx, w - 4, 12, 3, 4, '#4e342e');
  T(ctx, 3, 12, 2, 3, '#5d4037'); T(ctx, w - 5, 12, 2, 3, '#5d4037');
  // objetos em cima: monitor, caneca, papelada
  if (!o.bare) {
    T(ctx, 6, -1, 12, 8, '#37474f');
    T(ctx, 7, 0, 10, 6, '#546e7a');
    T(ctx, 8, 1, 8, 4, PAL.screen);
    hLine(ctx, 9, 2, 6, '#1b5e20'); hLine(ctx, 9, 4, 4, '#1b5e20');
    T(ctx, 12, 7, 2, 3, '#263238');
    T(ctx, 22, 4, 5, 5, PAL.white);
    T(ctx, 23, 5, 3, 2, PAL.coffee);
    T(ctx, 25, 5, 1, 2, PAL.white);
    if (o.papers !== false) {
      T(ctx, 1, 4, 5, 5, PAL.paper);
      hLine(ctx, 2, 6, 3, PAL.paperLine); hLine(ctx, 2, 8, 3, PAL.paperLine);
    }
  }
}

/** Cadeira de escritorio 16x16, giratoria (2 frames). */
function chair(ctx, f, o = {}) {
  const ang = o.spin ? f * 45 : 0;
  ctx.save();
  if (o.spin) { ctx.translate(8, 8); ctx.rotate((ang * Math.PI) / 180); ctx.translate(-8, -8); }
  T(ctx, 3, 1, 10, 8, '#37474f');
  T(ctx, 3, 1, 10, 2, '#546e7a');
  T(ctx, 5, 3, 6, 4, '#263238');
  T(ctx, 2, 4, 2, 5, '#263238');
  T(ctx, 12, 4, 2, 5, '#263238');
  T(ctx, 7, 9, 2, 4, '#455a64');
  pxEllipse(ctx, 8, 14, 6, 2, '#37474f');
  // roldanas
  D(ctx, 2, 14, PAL.black); D(ctx, 14, 14, PAL.black);
  ctx.restore();
}

/** Planta em vaso (2 frames balancando). */
function plant(ctx, f) {
  T(ctx, 5, 11, 6, 5, PAL.pot);
  T(ctx, 5, 11, 6, 1, '#a1887f');
  const sway = f % 2 ? 1 : -1;
  pxCircle(ctx, 8 + sway, 8, 4, PAL.plantDark);
  pxCircle(ctx, 8 + sway * 2, 6, 3, PAL.plant);
  pxCircle(ctx, 11 - sway, 9, 3, PAL.plant);
  pxCircle(ctx, 5 - sway, 9, 3, PAL.plant);
  D(ctx, 7, 4, '#66bb6a'); D(ctx, 10, 5, '#81c784');
}

/** Impressora destrutivel (16x16) com luz piscando e papel saindo. */
function printer(ctx, f, o = {}) {
  T(ctx, 1, 5, 14, 10, PAL.printer);
  T(ctx, 1, 5, 14, 2, '#fafafa');
  T(ctx, 1, 13, 14, 2, PAL.printerDark);
  T(ctx, 2, 2, 5, 4, PAL.printerDark);
  T(ctx, 4, 1, 8, 3, PAL.white);
  T(ctx, 3, 8, 10, 3, '#bdbdbd');
  T(ctx, 5, 9, 6, 2, PAL.paper);
  D(ctx, 12, 6, f % 2 ? '#4caf50' : '#2e7d32');
  D(ctx, 13, 6, '#e53935');
  if (f % 4 === 3) { T(ctx, 4, 15, 8, 1, PAL.paper); }
  if (o.broken) {
    pxLine(ctx, 2, 6, 6, 12, '#37474f');
    pxLine(ctx, 9, 5, 13, 12, '#37474f');
  }
}

/** Lixeira com papel amassado. */
function trash(ctx) {
  T(ctx, 3, 5, 10, 10, PAL.trash);
  T(ctx, 3, 5, 10, 1, '#90a4ae');
  T(ctx, 2, 4, 12, 2, '#455a64');
  hLine(ctx, 4, 8, 8, '#455a64');
  hLine(ctx, 4, 11, 8, '#455a64');
  T(ctx, 5, 2, 6, 3, PAL.paperShade);
  D(ctx, 11, 3, PAL.paper);
}

/** Quadro na parede com "GRÁFICO QUADRUPLE" subindo. */
function picture(ctx, f) {
  T(ctx, 1, 3, 14, 10, PAL.frame);
  T(ctx, 2, 4, 12, 8, PAL.framePic);
  const mode = f % 2;
  T(ctx, 3, 10, 2, 2, '#1b5e20');
  T(ctx, 5, 8 - mode, 2, 4, '#1b5e20');
  T(ctx, 7, 6 - mode * 2, 2, 6, '#1b5e20');
  T(ctx, 9, 9, 2, 3, '#c62828');
  T(ctx, 11, 5 - mode, 2, 7, '#1b5e20');
  hLine(ctx, 3, 11, 10, '#263238');
}

/** Porta de elevador 32x32 (4 frames abrindo). */
function elevator(ctx, f) {
  T(ctx, 0, 0, 32, 32, '#37474f');
  T(ctx, 1, 1, 30, 30, PAL.steel);
  const open = [0, 3, 8, 3][f % 4];
  T(ctx, 2, 2, 14 - open, 28, '#cfd8dc');
  T(ctx, 18 + open, 2, 14 - open, 28, '#cfd8dc');
  pxLine(ctx, 16, 2, 16, 29, '#263238');
  T(ctx, 2, 2, 12, 24 - open, '#b0bec5');
  T(ctx, 20, 2, 12, 24 - open, '#b0bec5');
  T(ctx, 12, 3, 8, 5, '#263238');
  for (let i = 0; i < 3; i++) D(ctx, 13 + i * 3, 5, i === f % 3 ? '#4caf50' : '#37474f');
  hLine(ctx, 0, 30, 32, '#263238');
}

/** Maquina de cafe (cura completa 1x por andar). */
function coffeemaker(ctx, f, o = {}) {
  T(ctx, 2, 0, 12, 20, '#263238');
  T(ctx, 3, 1, 10, 18, '#37474f');
  T(ctx, 3, 2, 10, 4, '#546e7a');
  hLine(ctx, 4, 3, 8, f % 2 ? '#4caf50' : '#2e7d32');
  T(ctx, 4, 7, 8, 5, '#1b1b26');
  T(ctx, 5, 8, 6, 3, PAL.coffee);
  T(ctx, 3, 13, 10, 5, '#455a64');
  T(ctx, 7, 14, 3, 4, PAL.white);
  if (f % 2 || o.used) { D(ctx, 11, 15, '#e53935'); }
  else D(ctx, 11, 15, '#4caf50');
  // vapor
  if (!o.used) { D(ctx, 6, 21, '#e8e8f066'); D(ctx, 9, 22, '#e8e8f033'); }
  if (o.used) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(2, 0, 12, 20); }
}

/** Maquina de vendas / loja. */
function vending(ctx, f) {
  T(ctx, 0, 0, 16, 24, '#37474f');
  T(ctx, 1, 1, 14, 22, '#546e7a');
  T(ctx, 2, 3, 12, 14, '#263238');
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      T(ctx, 3 + c * 4, 4 + r * 4, 3, 3, ['#ef5350', '#42a5f5', '#81c784', '#ffd54f'][(r + c + (f % 2)) % 4]);
    }
  }
  hLine(ctx, 3, 12, 10, '#90a4ae');
  T(ctx, 3, 18, 10, 4, '#455a64');
  T(ctx, 6, 19, 4, 2, PAL.black);
  D(ctx, 12, 2, f % 2 ? '#4caf50' : '#37474f');
}

/** Lousa de reuniao com "backlog" escrito. */
function whiteboard(ctx) {
  T(ctx, 0, 2, 16, 12, PAL.white);
  box(ctx, 0, 2, 16, 12, '#90a4ae');
  hLine(ctx, 2, 5, 6, '#1e88e5'); hLine(ctx, 2, 7, 10, '#90a4ae');
  hLine(ctx, 2, 9, 8, '#90a4ae'); hLine(ctx, 2, 11, 11, '#d32f2f');
  D(ctx, 12, 11, '#d32f2f'); D(ctx, 13, 4, '#43a047');
}

/** Bebedouro. */
function watercooler(ctx, f) {
  T(ctx, 3, 2, 10, 10, '#81d4fa');
  T(ctx, 3, 2, 10, 1, '#e1f5fe');
  T(ctx, 3, 12, 10, 8, '#e0e0e0');
  T(ctx, 3, 12, 10, 1, '#fafafa');
  T(ctx, 5, 15, 2, 2, '#42a5f5'); T(ctx, 9, 15, 2, 2, '#ef5350');
  if (f % 2) { D(ctx, 8, 18, '#4fc3f7'); D(ctx, 8, 19, '#4fc3f7'); }
  T(ctx, 3, 19, 10, 1, '#9e9e9e');
}

/** Rack de servidor (tema TI). */
function server(ctx, f) {
  T(ctx, 1, 0, 14, 28, '#263238');
  T(ctx, 2, 1, 12, 26, '#37474f');
  for (let i = 0; i < 6; i++) {
    T(ctx, 3, 2 + i * 4, 10, 3, '#1b1b26');
    D(ctx, 12, 3 + i * 4, (f + i) % 3 === 0 ? '#00e676' : '#2e7d32');
    D(ctx, 3, 3 + i * 4, (f + i) % 4 === 0 ? '#ffd54f' : '#4e342e');
  }
}

/** Caixa de som / taiko decorativo. */
function speaker(ctx, f) {
  T(ctx, 2, 2, 12, 12, '#37474f');
  pxCircle(ctx, 8, 8, 4, '#263238');
  pxCircle(ctx, 8, 8, 2 + (f % 2), '#546e7a');
  D(ctx, 4, 4, '#90a4ae'); D(ctx, 12, 12, '#90a4ae');
}

/** Projetor de teto (destrutivel na luta do gerente). */
function projector(ctx, f) {
  T(ctx, 2, 4, 12, 8, '#cfd8dc');
  T(ctx, 2, 4, 12, 2, '#eceff1');
  pxCircle(ctx, 6, 8, 3, '#37474f');
  T(ctx, 9, 6, 4, 4, f % 2 ? '#ffd54f' : '#ffb300');
  T(ctx, 0, 5, 2, 6, '#90a4ae'); T(ctx, 14, 5, 2, 6, '#90a4ae');
  hLine(ctx, 2, 12, 12, '#607d8b');
  if (f % 2) { D(ctx, 12, 11, '#ff5252'); }
}
