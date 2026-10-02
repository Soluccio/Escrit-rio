/**
 * Pathfinding.js — pathfinding grid-based leve.
 * Em vez de rodar A* por inimigo, calculamos UM campo de fluxo (BFS) do alvo
 * para toda a sala a cada N ms. Todos os inimigos leem a direcao desse campo:
 * barato (uma BFS por sala) e nunca trava em parede.
 */
import { TILE } from '../data/constants.js';

const DIRS8 = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

export class FlowField {
  constructor(cols, rows) {
    this.cols = cols; this.rows = rows;
    this.dist = new Uint16Array(cols * rows).fill(65535);
    this.queue = new Int32Array(cols * rows);
    this.target = null;
    this.age = 0;
  }

  /** Recalcula o campo a partir da posicao do alvo (em px). */
  build(map, tx, ty, threshold = 1.0) {
    this.age = 0;
    const { cols, rows, dist, queue } = this;
    dist.fill(65535);
    const sx = Math.floor(tx / TILE), sy = Math.floor(ty / TILE);
    if (sx < 0 || sy < 0 || sx >= cols || sy >= rows) return;
    let head = 0, tail = 0;
    const start = sy * cols + sx;
    dist[start] = 0;
    queue[tail++] = start;
    while (head < tail) {
      const cur = queue[head++];
      const cx = cur % cols, cy = (cur - cx) / cols;
      const d = dist[cur];
      for (let i = 0; i < 8; i++) {
        const nx = cx + DIRS8[i][0], ny = cy + DIRS8[i][1];
        if (nx < 1 || ny < 1 || nx >= cols - 1 || ny >= rows - 1) continue;
        if (map.isSolidTile(nx, ny)) continue;
        // diagonal so passa se os dois ortogonais estiverem livres
        if (i >= 4 && (map.isSolidTile(cx, ny) || map.isSolidTile(nx, cy))) continue;
        const ni = ny * cols + nx;
        if (dist[ni] !== 65535) continue;
        dist[ni] = d + 1;
        queue[tail++] = ni;
      }
    }
    this.target = { x: tx, y: ty };
  }

  /** Distancia em tiles ate o alvo (-1 = inalcancavel). */
  distanceAt(px, py) {
    const cx = Math.floor(px / TILE), cy = Math.floor(py / TILE);
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return -1;
    const d = this.dist[cy * this.cols + cx];
    return d === 65535 ? -1 : d;
  }

  /**
   * Direcao (normalizada) para seguir o campo a partir de uma posicao.
   * Retorna {x, y, dist} — se estiver no alvo, aponta para ele direto.
   */
  directionAt(px, py, targetX, targetY) {
    const cx = Math.floor(px / TILE), cy = Math.floor(py / TILE);
    if (cx < 1 || cy < 1 || cx >= this.cols - 1 || cy >= this.rows - 1) {
      return this._direct(px, py, targetX, targetY);
    }
    const cur = this.dist[cy * this.cols + cx];
    if (cur === 65535 || cur === 0) return this._direct(px, py, targetX, targetY);
    let best = cur, bx = 0, by = 0;
    for (let i = 0; i < 8; i++) {
      const nx = cx + DIRS8[i][0], ny = cy + DIRS8[i][1];
      if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;
      const nd = this.dist[ny * this.cols + nx];
      if (nd < best) { best = nd; bx = DIRS8[i][0]; by = DIRS8[i][1]; }
    }
    if (!bx && !by) return this._direct(px, py, targetX, targetY);
    const len = Math.hypot(bx, by) || 1;
    // suaviza em direcao ao alvo quando perto/visivel
    return { x: bx / len, y: by / len, dist: cur };
  }

  _direct(px, py, tx, ty) {
    const dx = tx - px, dy = ty - py;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len, dist: Math.hypot(dx, dy) / TILE };
  }
}
