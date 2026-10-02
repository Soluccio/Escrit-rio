/**
 * softcanvas.mjs — implementacao MINIMA de CanvasRenderingContext2D em software,
 * sem dependencia nenhuma. Serve para rodar o jogo em Node (testes headless e
 * ferramenta de screenshot), reaproveitando exatamente o mesmo codigo de render.
 *
 * Suporta o subconjunto usado pelo jogo: fillRect, drawImage (com escala e rotacao),
 * paths (arc/ellipse/moveTo/lineTo/closePath/fill/stroke), transforms, globalAlpha,
 * globalCompositeOperation (source-over, source-in), getImageData e clearRect.
 */
const TAU = Math.PI * 2;

class Mat {
  constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; }
  set(a, b, c, d, e, f) { this.a = a; this.b = b; this.c = c; this.d = d; this.e = e; this.f = f; return this; }
  clone() { const m = new Mat(); return m.set(this.a, this.b, this.c, this.d, this.e, this.f); }
  mul(n) { // this = this * n
    const a = this.a * n.a + this.c * n.b, b = this.b * n.a + this.d * n.b;
    const c = this.a * n.c + this.c * n.d, d = this.b * n.c + this.d * n.d;
    const e = this.a * n.e + this.c * n.f + this.e, f = this.b * n.e + this.d * n.f + this.f;
    return this.set(a, b, c, d, e, f);
  }
  translate(x, y) { return this.mul(new Mat().set(1, 0, 0, 1, x, y)); }
  scale(x, y) { return this.mul(new Mat().set(x, 0, 0, y, 0, 0)); }
  rotate(r) { const c = Math.cos(r), s = Math.sin(r); return this.mul(new Mat().set(c, s, -s, c, 0, 0)); }
  apply(x, y) { return [this.a * x + this.c * y + this.e, this.b * x + this.d * y + this.f]; }
  invert() {
    const det = this.a * this.d - this.b * this.c;
    if (!det) return null;
    const m = new Mat();
    m.set(this.d / det, -this.b / det, -this.c / det, this.a / det,
      (this.c * this.f - this.d * this.e) / det, (this.b * this.e - this.a * this.f) / det);
    return m;
  }
}

function parseColor(str) {
  if (typeof str !== 'string') return [0, 0, 0, 1];
  let s = str.trim();
  if (s[0] === '#') {
    if (s.length === 4) return [parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16), parseInt(s[3] + s[3], 16), 1];
    if (s.length === 7) return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 1];
    if (s.length === 9) return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), parseInt(s.slice(7, 9), 16) / 255];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(',').map(v => parseFloat(v));
    return [p[0] | 0, p[1] | 0, p[2] | 0, p.length > 3 ? p[3] : 1];
  }
  if (s === 'white') return [255, 255, 255, 1];
  if (s === 'black') return [0, 0, 0, 1];
  return [255, 0, 255, 1];
}

export class SoftCanvas {
  constructor(w = 0, h = 0) {
    this._w = 0; this._h = 0; this._data = null;
    this.width = w; this.height = h;
    this._ctx = new SoftCtx(this);
  }
  get width() { return this._w; }
  set width(v) { this._w = v | 0; this._alloc(); }
  get height() { return this._h; }
  set height(v) { this._h = v | 0; this._alloc(); }
  _alloc() { this._data = new Uint8ClampedArray(Math.max(0, this._w * this._h * 4)); }
  getContext() { return this._ctx; }
  toDataURL() { return null; }
  /** Pixels RGBA crus (para o encoder PNG). */
  get pixels() { return this._data; }
}

export class SoftCtx {
  constructor(canvas) {
    this.canvas = canvas;
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1;
    this.globalAlpha = 1;
    this.globalCompositeOperation = 'source-over';
    this.imageSmoothingEnabled = false;
    this.m = new Mat();
    this.stack = [];
    this.path = [];        // subcaminhos: [{pts:[[x,y]...]}]
    this._cur = null;
  }

  // -------------------------------------------------------------- estado
  save() { this.stack.push({ m: this.m.clone(), fillStyle: this.fillStyle, strokeStyle: this.strokeStyle, lineWidth: this.lineWidth, globalAlpha: this.globalAlpha, gco: this.globalCompositeOperation }); }
  restore() {
    const s = this.stack.pop();
    if (!s) return;
    this.m = s.m; this.fillStyle = s.fillStyle; this.strokeStyle = s.strokeStyle;
    this.lineWidth = s.lineWidth; this.globalAlpha = s.globalAlpha; this.globalCompositeOperation = s.gco;
  }
  translate(x, y) { this.m.translate(x, y); }
  scale(x, y) { this.m.scale(x, y); }
  rotate(r) { this.m.rotate(r); }
  setTransform(a, b, c, d, e, f) { this.m.set(a, b, c, d, e, f); }
  resetTransform() { this.m.set(1, 0, 0, 1, 0, 0); }
  clip() { /* nao usado pelo jogo */ }

  // -------------------------------------------------------------- pixels
  _blend(x, y, r, g, b, a) {
    const c = this.canvas;
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= c._w || y >= c._h || a <= 0) return;
    const i = (y * c._w + x) * 4;
    const d = c._data;
    if (a >= 1 && this.globalCompositeOperation === 'source-over') {
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
      return;
    }
    const da = d[i + 3] / 255;
    const oa = a + da * (1 - a);
    if (oa <= 0) { d[i + 3] = 0; return; }
    d[i] = (r * a + d[i] * da * (1 - a)) / oa;
    d[i + 1] = (g * a + d[i + 1] * da * (1 - a)) / oa;
    d[i + 2] = (b * a + d[i + 2] * da * (1 - a)) / oa;
    d[i + 3] = oa * 255;
  }

  strokeRect(x, y, w, h) {
    const [r, g, b, ca] = parseColor(this.strokeStyle);
    const a = ca * this.globalAlpha;
    const lw = Math.max(1, Math.round(this.lineWidth));
    const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(p => this.m.apply(p[0], p[1]));
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let s = 0; s <= steps; s++) {
        const px = x0 + ((x1 - x0) * s) / steps, py = y0 + ((y1 - y0) * s) / steps;
        for (let oy = 0; oy < lw; oy++) for (let ox = 0; ox < lw; ox++) this._blend(px + ox, py + oy, r, g, b, a);
      }
    }
  }

  clearRect(x, y, w, h) {
    const c = this.canvas;
    for (let yy = Math.floor(y); yy < Math.floor(y + h); yy++) {
      for (let xx = Math.floor(x); xx < Math.floor(x + w); xx++) {
        if (xx < 0 || yy < 0 || xx >= c._w || yy >= c._h) continue;
        const i = (yy * c._w + xx) * 4;
        c._data[i] = c._data[i + 1] = c._data[i + 2] = c._data[i + 3] = 0;
      }
    }
  }

  fillRect(x, y, w, h) {
    const [r, g, b, ca] = parseColor(this.fillStyle);
    const a = ca * this.globalAlpha;
    const m = this.m;
    // 'source-in' precisa vir ANTES do atalho de identidade (usado no flash
    // branco dos sprites: preserva o alpha do desenho e troca a cor)
    if (this.globalCompositeOperation === 'source-in') {
      const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(p => m.apply(p[0], p[1]));
      this._scanPoly(pts, (xx, yy) => {
        const c = this.canvas, i = (yy * c._w + xx) * 4;
        if (c._data[i + 3] <= 0) return;
        c._data[i] = r; c._data[i + 1] = g; c._data[i + 2] = b;
        c._data[i + 3] = Math.min(255, c._data[i + 3] * a);
      });
      return;
    }
    const identity = m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1;
    if (identity) {
      const ox = m.e, oy = m.f;
      const x0 = Math.round(x + ox), y0 = Math.round(y + oy);
      const x1 = Math.round(x + w + ox), y1 = Math.round(y + h + oy);
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) this._blend(xx, yy, r, g, b, a);
      return;
    }
    const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(p => m.apply(p[0], p[1]));
    this._scanPoly(pts, (xx, yy) => this._blend(xx, yy, r, g, b, a));
  }

  /** Scanline com regra par-impar sobre um poligono em coords de tela. */
  _scanPoly(pts, plot) {
    const c = this.canvas;
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    for (const [x, y] of pts) { if (y < minY) minY = y; if (y > maxY) maxY = y; if (x < minX) minX = x; if (x > maxX) maxX = x; }
    const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(c._h - 1, Math.ceil(maxY));
    const x0 = Math.max(0, Math.floor(minX)), x1 = Math.min(c._w - 1, Math.ceil(maxX));
    for (let y = y0; y <= y1; y++) {
      const cy = y + 0.5;
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const sx = Math.max(x0, Math.ceil(xs[i] - 0.5)), ex = Math.min(x1, Math.floor(xs[i + 1] - 0.5));
        for (let x = sx; x <= ex; x++) plot(x, y);
      }
    }
  }

  /**
   * drawImage com 3, 5 ou 9 argumentos (igual ao Canvas2D real):
   *   (img, dx, dy)
   *   (img, dx, dy, dw, dh)
   *   (img, sx, sy, sw, sh, dx, dy, dw, dh)
   */
  drawImage(img, a1, a2, a3, a4, a5, a6, a7, a8) {
    const src = img instanceof SoftCanvas ? img : (img && img.canvas) || img;
    if (!src || !src._data) return;
    let sx = 0, sy = 0, sw = src._w, sh = src._h, dx, dy, dw, dh;
    if (a8 !== undefined) {          // 9 argumentos: recorte da origem
      sx = a1; sy = a2; sw = a3; sh = a4; dx = a5; dy = a6; dw = a7; dh = a8;
    } else if (a4 !== undefined) {   // 5 argumentos: escala
      dx = a1; dy = a2; dw = a3; dh = a4;
    } else {                         // 3 argumentos
      dx = a1; dy = a2; dw = src._w; dh = src._h;
    }
    if (!(dw > 0 && dh > 0 && sw > 0 && sh > 0)) return;
    const m = this.m;
    const identity = m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1;
    const d = src._data;
    if (identity) {
      const ox = Math.round(dx + m.e), oy = Math.round(dy + m.f);
      const tw = Math.round(dw), th = Math.round(dh);
      for (let y = 0; y < th; y++) {
        const py = oy + y;
        if (py < 0 || py >= this.canvas._h) continue;
        const v = Math.min(src._h - 1, sy + Math.floor((y * sh) / th));
        for (let x = 0; x < tw; x++) {
          const px = ox + x;
          if (px < 0 || px >= this.canvas._w) continue;
          const u = Math.min(src._w - 1, sx + Math.floor((x * sw) / tw));
          const si = (v * src._w + u) * 4;
          const al = (d[si + 3] / 255) * this.globalAlpha;
          if (al <= 0) continue;
          this._blend(px, py, d[si], d[si + 1], d[si + 2], al);
        }
      }
      return;
    }
    // com transformacao: usa a inversa para amostrar
    const inv = m.invert();
    if (!inv) return;
    const corners = [[dx, dy], [dx + dw, dy], [dx + dw, dy + dh], [dx, dy + dh]].map(p => m.apply(p[0], p[1]));
    this._scanPoly(corners, (x, y) => {
      const [ux, uy] = inv.apply(x + 0.5, y + 0.5);
      const u = sx + Math.floor(((ux - dx) / dw) * sw);
      const v = sy + Math.floor(((uy - dy) / dh) * sh);
      if (u < sx || v < sy || u >= sx + sw || v >= sy + sh) return;
      if (u < 0 || v < 0 || u >= src._w || v >= src._h) return;
      const si = (v * src._w + u) * 4;
      const al = (d[si + 3] / 255) * this.globalAlpha;
      if (al <= 0) return;
      this._blend(x, y, d[si], d[si + 1], d[si + 2], al);
    });
  }

  getImageData(x, y, w, h) {
    const out = new Uint8ClampedArray(w * h * 4);
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const sxp = (x + xx) | 0, syp = (y + yy) | 0;
        if (sxp < 0 || syp < 0 || sxp >= this.canvas._w || syp >= this.canvas._h) continue;
        const si = (syp * this.canvas._w + sxp) * 4, di = (yy * w + xx) * 4;
        out[di] = this.canvas._data[si]; out[di + 1] = this.canvas._data[si + 1];
        out[di + 2] = this.canvas._data[si + 2]; out[di + 3] = this.canvas._data[si + 3];
      }
    }
    return { data: out, width: w, height: h };
  }

  putImageData(img, dx, dy) {
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const si = (y * img.width + x) * 4;
        const a = img.data[si + 3] / 255;
        if (a <= 0) continue;
        this._blend(dx + x, dy + y, img.data[si], img.data[si + 1], img.data[si + 2], a);
      }
    }
  }

  // -------------------------------------------------------------- paths
  beginPath() { this.path = []; this._cur = null; }
  moveTo(x, y) { this._cur = { pts: [[x, y]] }; this.path.push(this._cur); }
  lineTo(x, y) { if (!this._cur) this.moveTo(x, y); else this._cur.pts.push([x, y]); }
  closePath() { if (this._cur && this._cur.pts.length) this._cur.pts.push(this._cur.pts[0].slice()); }
  rect(x, y, w, h) {
    this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath();
  }
  arc(cx, cy, r, a0 = 0, a1 = TAU, ccw = false) { this._ellipsePts(cx, cy, r, r, a0, a1, ccw); }
  ellipse(cx, cy, rx, ry, rot = 0, a0 = 0, a1 = TAU, ccw = false) {
    // rotacao suportada via rotacao extra dos pontos
    const pts = [];
    const steps = Math.max(8, Math.ceil(Math.abs(a1 - a0) * 8));
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps * (ccw ? -1 : 1);
      const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
    this._cur = { pts }; this.path.push(this._cur);
  }
  _ellipsePts(cx, cy, rx, ry, a0, a1, ccw) {
    const pts = [];
    const steps = Math.max(8, Math.ceil(Math.abs(a1 - a0) * 8));
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps * (ccw ? -1 : 1);
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    this._cur = { pts }; this.path.push(this._cur);
  }
  _flat() {
    const out = [];
    for (const sub of this.path) if (sub.pts.length > 1) out.push(sub.pts);
    return out;
  }
  fill() {
    const [r, g, b, ca] = parseColor(this.fillStyle);
    const a = ca * this.globalAlpha;
    const m = this.m;
    for (const sub of this._flat()) {
      const pts = sub.map(p => m.apply(p[0], p[1]));
      this._scanPoly(pts, (x, y) => this._blend(x, y, r, g, b, a));
    }
  }
  stroke() {
    const [r, g, b, ca] = parseColor(this.strokeStyle);
    const a = ca * this.globalAlpha;
    const lw = Math.max(1, Math.round(this.lineWidth));
    const m = this.m;
    for (const sub of this._flat()) {
      const pts = sub.map(p => m.apply(p[0], p[1]));
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
        const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
        for (let s = 0; s <= steps; s++) {
          const x = x0 + ((x1 - x0) * s) / steps, y = y0 + ((y1 - y0) * s) / steps;
          for (let oy = 0; oy < lw; oy++) for (let ox = 0; ox < lw; ox++) this._blend(x + ox, y + oy, r, g, b, a);
        }
      }
    }
  }
  fillText() { /* o jogo usa fonte propria (PixelFont) */ }
  measureText(t) { return { width: (t || '').length * 6 }; }
}

/** Fabrica de canvas para injetar no SpriteFactory / Game em ambiente headless. */
export function softCanvasFactory(w, h) { return new SoftCanvas(w, h); }

export default SoftCanvas;
