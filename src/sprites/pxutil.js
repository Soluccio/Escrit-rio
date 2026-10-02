/**
 * pxutil.js — primitivas de desenho pixel-perfect (fillRect, 1px por vez).
 * Nada de antialias: todo desenho passa por aqui e escreve pixels inteiros.
 */

/** Pinta um pixel. */
export function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, 1, 1);
}

/** Retangulo cheio. */
export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

/** Retangulo vazado. */
export function box(ctx, x, y, w, h, color) {
  rect(ctx, x, y, w, 1, color);
  rect(ctx, x, y + h - 1, w, 1, color);
  rect(ctx, x, y, 1, h, color);
  rect(ctx, x + w - 1, y, 1, h, color);
}

/** Linha de Bresenham. */
export function pxLine(ctx, x0, y0, x1, y1, color) {
  x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (let guard = 0; guard < 512; guard++) {
    px(ctx, x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

/** Linha horizontal rapida. */
export function hLine(ctx, x, y, w, color) { rect(ctx, x, y, w, 1, color); }

/** Triangulo cheio (rasterizado por scanline). */
export function pxTri(ctx, ax, ay, bx, by, cx2, cy2, color) {
  const minY = Math.floor(Math.min(ay, by, cy2));
  const maxY = Math.ceil(Math.max(ay, by, cy2));
  const pts = [[ax, ay], [bx, by], [cx2, cy2]];
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < 3; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 3];
      if ((y1 <= y && y2 >= y) || (y2 <= y && y1 >= y)) {
        const t = (y - y1) / ((y2 - y1) || 1);
        xs.push(x1 + (x2 - x1) * t);
      }
    }
    if (xs.length >= 2) {
      const sx = Math.round(Math.min(...xs)), ex = Math.round(Math.max(...xs));
      hLine(ctx, sx, y, ex - sx + 1, color);
    }
  }
}

/** Circulo cheio (algoritmo de simetria de octantes). */
export function pxCircle(ctx, cx, cy, r, color) {
  cx |= 0; cy |= 0; r |= 0;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    hLine(ctx, cx - w, cy + y, w * 2 + 1, color);
  }
}

/** Anel de circulo. */
export function pxRing(ctx, cx, cy, r, color) {
  cx |= 0; cy |= 0; r = Math.max(1, r | 0);
  for (let a = 0; a < 360; a += 2) {
    const rad = (a * Math.PI) / 180;
    px(ctx, cx + Math.round(Math.cos(rad) * r), cy + Math.round(Math.sin(rad) * r), color);
  }
}

/** Elipse cheia. */
export function pxEllipse(ctx, cx, cy, rx, ry, color) {
  for (let y = -ry; y <= ry; y++) {
    const t = 1 - (y * y) / (ry * ry);
    if (t < 0) continue;
    const w = Math.floor(rx * Math.sqrt(t));
    hLine(ctx, cx - w, cy + y, w * 2 + 1, color);
  }
}

/** Arco/cone de ataque (setor circular cheio). */
export function pxArc(ctx, cx, cy, r0, r1, a0, a1, color, step = 0.06) {
  for (let a = a0; a <= a1; a += step) {
    for (let r = r0; r <= r1; r += 0.5) {
      px(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, color);
    }
  }
}

/**
 * Desenha a partir de um "mapa" de texto — cada caractere e uma cor.
 * '.' = transparente. Muito mais legivel que 200 fillRect na mao.
 *   pxMap(ctx, 0, 0, ['.XX.', 'X..X'], { X: '#fff' })
 */
export function pxMap(ctx, ox, oy, rows, legend, flip = false) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = legend[ch];
      if (!col) continue;
      px(ctx, ox + (flip ? row.length - 1 - x : x), oy + y, col);
    }
  }
}

/** Sombra elipsoide padrao no chao. */
export function shadow(ctx, cx, cy, rx, ry) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Contorno claro/escuro de 1px em volta do desenho (sprite pop). */
export function outline(ctx, w, h, color) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 8;
  const edges = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) edges.push([x, y]);
    }
  }
  for (const [x, y] of edges) px(ctx, x, y, color);
}

/**
 * Fabrica global de canvas: o Game registra aqui a versao headless
 * (SoftCanvas) quando roda fora do navegador. Assim TileMap/Props tambem
 * conseguem criar canvas de cache sem depender do DOM.
 */
let CANVAS_FACTORY = null;
export function setCanvasFactory(fn) { CANVAS_FACTORY = fn; }
export function getCanvasFactory() { return CANVAS_FACTORY; }

/** Cria um canvas offscreen (aceita injecao p/ ambiente headless). */
export function makeCanvas(w, h, factory = null) {
  if (factory) return factory(w, h);
  if (CANVAS_FACTORY) return CANVAS_FACTORY(w, h);
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/** Contexto 2D sem suavizacao. */
export function ctx2d(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** Converte um canvas offscreen em data URL (ferramentas de screenshot). */
export function toDataURL(canvas) {
  if (canvas.toDataURL) return canvas.toDataURL('image/png');
  return null;
}
