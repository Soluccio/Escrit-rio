/**
 * PixelFont.js — fonte bitmap 5x7 desenhada a mao (zero dependencia).
 * Cada caractere e um mapa de 7 linhas de 5 pixels. Acentos sao desenhados
 * como um pixel extra acima da letra base (á, é, ç, ã...).
 * Nao usa fillText: tudo sai em fillRect, entao funciona tambem no
 * renderizador headless (testes/screenshot).
 */
const G = {
  A: '01110,10001,10001,11111,10001,10001,10001',
  B: '11110,10001,10001,11110,10001,10001,11110',
  C: '01110,10001,10000,10000,10000,10001,01110',
  D: '11110,10001,10001,10001,10001,10001,11110',
  E: '11111,10000,10000,11110,10000,10000,11111',
  F: '11111,10000,10000,11110,10000,10000,10000',
  G: '01110,10001,10000,10111,10001,10001,01111',
  H: '10001,10001,10001,11111,10001,10001,10001',
  I: '11111,00100,00100,00100,00100,00100,11111',
  J: '00111,00010,00010,00010,00010,10010,01100',
  K: '10001,10010,10100,11000,10100,10010,10001',
  L: '10000,10000,10000,10000,10000,10000,11111',
  M: '10001,11011,10101,10101,10001,10001,10001',
  N: '10001,11001,10101,10011,10001,10001,10001',
  O: '01110,10001,10001,10001,10001,10001,01110',
  P: '11110,10001,10001,11110,10000,10000,10000',
  Q: '01110,10001,10001,10001,10101,10011,01101',
  R: '11110,10001,10001,11110,10100,10010,10001',
  S: '01111,10000,10000,01110,00001,00001,11110',
  T: '11111,00100,00100,00100,00100,00100,00100',
  U: '10001,10001,10001,10001,10001,10001,01110',
  V: '10001,10001,10001,10001,10001,01010,00100',
  W: '10001,10001,10001,10101,10101,11011,10001',
  X: '10001,10001,01010,00100,01010,10001,10001',
  Y: '10001,10001,01010,00100,00100,00100,00100',
  Z: '11111,00001,00010,00100,01000,10000,11111',
  0: '01110,10011,10101,10101,10101,11001,01110',
  1: '00100,01100,00100,00100,00100,00100,01110',
  2: '01110,10001,00001,00010,00100,01000,11111',
  3: '11111,00010,00100,00010,00001,10001,01110',
  4: '00010,00110,01010,10010,11111,00010,00010',
  5: '11111,10000,11110,00001,00001,10001,01110',
  6: '00110,01000,10000,11110,10001,10001,01110',
  7: '11111,00001,00010,00100,01000,01000,01000',
  8: '01110,10001,10001,01110,10001,10001,01110',
  9: '01110,10001,10001,01111,00001,00010,01100',
  ' ': '00000,00000,00000,00000,00000,00000,00000',
  '.': '00000,00000,00000,00000,00000,01100,01100',
  ',': '00000,00000,00000,00000,01100,00100,01000',
  ':': '00000,01100,01100,00000,01100,01100,00000',
  ';': '00000,01100,01100,00000,01100,00100,01000',
  '!': '00100,00100,00100,00100,00100,00000,00100',
  '?': '01110,10001,00001,00110,00100,00000,00100',
  "'": '00100,00100,00000,00000,00000,00000,00000',
  '"': '01010,01010,00000,00000,00000,00000,00000',
  '-': '00000,00000,00000,11111,00000,00000,00000',
  '+': '00000,00100,00100,11111,00100,00100,00000',
  '/': '00001,00010,00010,00100,01000,01000,10000',
  '\\': '10000,01000,01000,00100,00010,00010,00001',
  '(': '00010,00100,01000,01000,01000,00100,00010',
  ')': '01000,00100,00010,00010,00010,00100,01000',
  '[': '01110,01000,01000,01000,01000,01000,01110',
  ']': '01110,00010,00010,00010,00010,00010,01110',
  '<': '00010,00100,01000,10000,01000,00100,00010',
  '>': '01000,00100,00010,00001,00010,00100,01000',
  '=': '00000,00000,11111,00000,11111,00000,00000',
  '_': '00000,00000,00000,00000,00000,00000,11111',
  '*': '00000,10101,01110,11111,01110,10101,00000',
  '%': '11001,11010,00010,00100,01000,01011,10011',
  '$': '00100,01111,10100,01110,00101,11110,00100',
  '#': '01010,01010,11111,01010,11111,01010,01010',
  '&': '01100,10010,10100,01000,10101,10010,01101',
  '@': '01110,10001,10111,10101,10111,10000,01110',
  '^': '00100,01010,10001,00000,00000,00000,00000',
  '|': '00100,00100,00100,00100,00100,00100,00100',
  '~': '00000,00000,01001,10110,00000,00000,00000',
  '\u2191': '00100,01110,10101,00100,00100,00100,00100',
  '\u2193': '00100,00100,00100,00100,10101,01110,00100',
  '\u2190': '00000,00100,01000,11111,01000,00100,00000',
  '\u2192': '00000,00100,00010,11111,00010,00100,00000',
  '\u25B6': '01000,01100,01110,01111,01110,01100,01000',
  '\u2665': '01010,11111,11111,11111,01110,00100,00000',
  '\u2022': '00000,00000,01100,01100,01100,00000,00000',
};

/** Acentos: caractere com diacritico -> [letra base, tipo de acento]. */
const ACCENTS = {
  'á': ['a', 'acute'], 'à': ['a', 'grave'], 'â': ['a', 'circ'], 'ã': ['a', 'tilde'], 'ä': ['a', 'diaer'],
  'é': ['e', 'acute'], 'è': ['e', 'grave'], 'ê': ['e', 'circ'], 'ë': ['e', 'diaer'],
  'í': ['i', 'acute'], 'ì': ['i', 'grave'], 'î': ['i', 'circ'],
  'ó': ['o', 'acute'], 'ò': ['o', 'grave'], 'ô': ['o', 'circ'], 'õ': ['o', 'tilde'],
  'ú': ['u', 'acute'], 'ù': ['u', 'grave'], 'û': ['u', 'circ'],
  'ç': ['c', 'cedilla'], 'ñ': ['n', 'tilde'],
  'Á': ['A', 'acute'], 'É': ['E', 'acute'], 'Í': ['I', 'acute'], 'Ó': ['O', 'acute'],
  'Ú': ['U', 'acute'], 'Ã': ['A', 'tilde'], 'Õ': ['O', 'tilde'], 'Ç': ['C', 'cedilla'], 'Â': ['A', 'circ'], 'Ê': ['E', 'circ'],
};

const CACHE = new Map();

function glyphRows(ch) {
  if (CACHE.has(ch)) return CACHE.get(ch);
  let base = ch, accent = null;
  if (ACCENTS[ch]) { base = ACCENTS[ch][0]; accent = ACCENTS[ch][1]; }
  const upper = base.toUpperCase();
  const raw = G[upper] || G[base] || null;
  const rows = raw ? raw.split(',') : null;
  const out = { rows, accent, base };
  CACHE.set(ch, out);
  return out;
}

export const CHAR_W = 5, CHAR_H = 7, SPACING = 1;

export class PixelFont {
  constructor() { this.cache = new Map(); }

  /** Largura em pixels de um texto nesta escala. */
  measure(text, scale = 1) {
    return text.length * (CHAR_W + SPACING) * scale - SPACING * scale;
  }

  /**
   * Desenha texto.
   * @param {number} scale 1 = 5x7, use 2 ou 3 para titulos
   * @param {string} align 'left' | 'center' | 'right'
   */
  draw(ctx, text, x, y, color = '#e8e8f0', scale = 1, align = 'left', shadow = null) {
    if (text === undefined || text === null) return 0;
    const s = String(text);
    let cx = Math.round(x);
    const w = this.measure(s, scale);
    if (align === 'center') cx = Math.round(x - w / 2);
    else if (align === 'right') cx = Math.round(x - w);
    const cy = Math.round(y);
    if (shadow) {
      this._draw(ctx, s, cx + scale, cy + scale, shadow, scale);
    }
    this._draw(ctx, s, cx, cy, color, scale);
    return w;
  }

  _draw(ctx, text, x, y, color, scale) {
    ctx.fillStyle = color;
    let ox = x;
    for (const ch of text) {
      if (ch === '\n') continue;
      const info = glyphRows(ch);
      if (info.rows) {
        for (let ry = 0; ry < 7; ry++) {
          const row = info.rows[ry];
          for (let rx = 0; rx < 5; rx++) {
            if (row[rx] === '1') ctx.fillRect(ox + rx * scale, y + ry * scale, scale, scale);
          }
        }
        if (info.accent) this._accent(ctx, info.accent, ox, y, scale);
      }
      ox += (CHAR_W + SPACING) * scale;
    }
  }

  _accent(ctx, kind, x, y, s) {
    const up = y - 2 * s;
    switch (kind) {
      case 'acute':
        ctx.fillRect(x + 3 * s, up, s, s);
        ctx.fillRect(x + 2 * s, up + s, s, s);
        break;
      case 'grave':
        ctx.fillRect(x + 1 * s, up, s, s);
        ctx.fillRect(x + 2 * s, up + s, s, s);
        break;
      case 'circ':
        ctx.fillRect(x + 1 * s, up + s, s, s);
        ctx.fillRect(x + 3 * s, up + s, s, s);
        ctx.fillRect(x + 2 * s, up, s, s);
        break;
      case 'tilde':
        ctx.fillRect(x + 1 * s, up, s, s);
        ctx.fillRect(x + 2 * s, up + s, s, s);
        ctx.fillRect(x + 3 * s, up, s, s);
        break;
      case 'diaer':
        ctx.fillRect(x + 1 * s, up + s, s, s);
        ctx.fillRect(x + 3 * s, up + s, s, s);
        break;
      case 'cedilla':
        ctx.fillRect(x + 2 * s, y + 7 * s, s, s);
        ctx.fillRect(x + 1 * s, y + 8 * s, s, s);
        break;
    }
  }

  /** Texto com quebra de linha automatica (pixel art). */
  wrap(ctx, text, x, y, maxWidth, color = '#e8e8f0', scale = 1, lineHeight = 10) {
    const words = text.split(' ');
    let line = '';
    let ly = y;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (this.measure(test, scale) > maxWidth && line) {
        this.draw(ctx, line, x, ly, color, scale, 'left');
        line = word;
        ly += lineHeight;
      } else line = test;
    }
    if (line) { this.draw(ctx, line, x, ly, color, scale, 'left'); ly += lineHeight; }
    return ly;
  }

  /**
   * Kanji de transicao desenhado com pixels (nao temos fonte CJK).
   * Cada kanji e um mapa 9x9 estilizado.
   */
  drawKanji(ctx, key, x, y, color = '#e8e8f0', scale = 2, alpha = 1) {
    const KANJI = {
      // 竹 (bambu) — andar 1
      '竹': ['1.......1', '.1.....1.', '.1111111.', '..1...1..', '.1111111.', '..1...1..', '..1...1..', '..1...1..', '.11...11.'],
      // 商 (comercio) — andar 2
      '商': ['..11111..', '....1....', '.1111111.', '.1..1..1.', '.1111111.', '.1..1..1.', '.1.....1.', '.1111111.', '........,'],
      // 書 (documento) — andar 3
      '書': ['..11111..', '.1111111.', '..11111..', '.1111111.', '..1...1..', '.1111111.', '..1...1..', '.1111111.', '...111...'],
      // 会 (reuniao) — andar 4
      '会': ['....1....', '...111...', '..1...1..', '.1111111.', '...1.1...', '..1...1..', '.1.....1.', '.1111111.', '.........'],
      // 技 (tecnica) — andar 5
      '技': ['..1.1....', '.111111..', '..1.1....', '..111.1..', '.1..1.1..', '.1...1...', '.1..1.1..', '1..1...1.', '.11....1.'],
      // 終 (fim) — andar 6
      '終': ['.1...1...', '1.1.1..1.', '.1..1.1..', '..1..1...', '.1.1..1..', '1.1....1.', '..1.1.1..', '.1...1.1.', '1.....1..'],
    };
    const rows = KANJI[key];
    if (!rows) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (let ry = 0; ry < rows.length; ry++) {
      for (let rx = 0; rx < rows[ry].length; rx++) {
        if (rows[ry][rx] === '1' || rows[ry][rx] === '#') {
          ctx.fillRect(x + rx * scale, y + ry * scale, scale, scale);
        }
      }
    }
    ctx.restore();
  }

  static kanjiFor(floorN) {
    return ['竹', '商', '書', '会', '技', '終'][Math.min(5, Math.max(0, floorN - 1))];
  }
}
