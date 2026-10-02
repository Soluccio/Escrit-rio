/**
 * Minimap.js — canto superior direito. Mostra apenas salas VISITADAS e
 * (com a bencao Post-it) as adjacentes descobertas. Icone por tipo de sala.
 * O painel se ajusta ao tamanho da area ja descoberta, entao nao sobra
 * aquele retangulo preto gigante no canto.
 */
import { VIEW_W, ROOM_ICON } from '../data/constants.js';
import { MINIMAP_COLORS } from '../sprites/Palette.js';

export class Minimap {
  constructor(font) { this.font = font; this.cell = 8; this.gap = 2; }

  /** Revela salas adjacentes (bencao Post-it). */
  updateReveal(floor, room, reveal) {
    room.discovered = true;
    if (!reveal) return;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const n = floor.at(room.gx + dx, room.gy + dy);
      if (n) n.discovered = true;
    }
  }

  draw(ctx, game) {
    const floor = game.floor;
    if (!floor) return;
    const known = floor.list.filter(r => r.visited || r.discovered);
    if (!known.length) return;

    const size = this.cell + this.gap;
    const minGX = Math.min(...known.map(r => r.gx));
    const maxGX = Math.max(...known.map(r => r.gx));
    const minGY = Math.min(...known.map(r => r.gy));
    const maxGY = Math.max(...known.map(r => r.gy));
    const cols = Math.max(3, maxGX - minGX + 1);
    const rows = Math.max(3, maxGY - minGY + 1);
    const w = cols * size + 4;
    const h = rows * size + 4;
    const ox = VIEW_W - w - 5;
    const oy = 34;
    const bx = ox + 2, by = oy + 2;

    ctx.fillStyle = '#0b0b14dd';
    ctx.fillRect(ox, oy, w, h);
    ctx.strokeStyle = '#2b2b3d';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, w - 1, h - 1);

    for (const room of known) {
      if (!room.visited && !room.discovered) continue;
      const x = bx + (room.gx - minGX) * size;
      const y = by + (room.gy - minGY) * size;
      const isCurrent = room === game.room;
      const color = room.visited ? (MINIMAP_COLORS[room.type] || '#8f8fa3') : '#3a3a4a';
      // marcador
      ctx.fillStyle = color;
      ctx.fillRect(x, y, this.cell, this.cell);
      ctx.fillStyle = '#0b0b14';
      ctx.fillRect(x + this.cell - 1, y + this.cell - 1, 1, 1);
      if (isCurrent) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 1, y - 1, this.cell + 2, 1);
        ctx.fillRect(x - 1, y + this.cell, this.cell + 2, 1);
        ctx.fillRect(x - 1, y - 1, 1, this.cell + 2);
        ctx.fillRect(x + this.cell, y - 1, 1, this.cell + 2);
      }
      if (room.visited) {
        this.font.draw(ctx, ROOM_ICON[room.type] || '?', x + this.cell / 2, y + 1, '#0b0b14', 1, 'center');
      }
      // portas conhecidas
      ctx.fillStyle = '#5a5a6b';
      const doorOnly = room.visited || isCurrent;
      if (doorOnly) {
        if (room.doors.E && (floor.at(room.gx + 1, room.gy)?.visited || floor.at(room.gx + 1, room.gy)?.discovered)) {
          ctx.fillRect(x + this.cell, y + 3, this.gap, 2);
        }
        if (room.doors.S && (floor.at(room.gx, room.gy + 1)?.visited || floor.at(room.gx, room.gy + 1)?.discovered)) {
          ctx.fillRect(x + 3, y + this.cell, 2, this.gap);
        }
      }
    }
    // legenda do andar
    this.font.draw(ctx, 'ANDAR ' + game.floorN, ox + w / 2, oy + h + 2, '#5a5a6b', 1, 'center');
  }
}
