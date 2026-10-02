#!/usr/bin/env node
/**
 * artsheet.mjs — gera pranchas PNG com TODO o pixel art do jogo, usando o
 * render headless (SoftCanvas). Serve para inspecionar visualmente os sprites
 * sem abrir o navegador.
 *   node tools/artsheet.mjs [outDir]
 */
import fs from 'node:fs';
import path from 'node:path';
import SoftCanvas from './softcanvas.mjs';
import { encodePNG } from './png.mjs';
import { SpriteFactory } from '../src/sprites/SpriteFactory.js';

const outDir = process.argv[2] || 'shots';
fs.mkdirSync(outDir, { recursive: true });

const sf = new SpriteFactory({ canvasFactory: (w, h) => new SoftCanvas(w, h) }).build();
console.log(`sprites: ${sf.stats.sprites} animacoes / ${sf.stats.frames} frames`);

/** Prancha em grade: cada animacao ocupa uma linha, frames em colunas. */
function grid(sheetKeys, cell, scale, name) {
  const maxF = sheetKeys.reduce((m, k) => Math.max(m, (sf.cache.get(k) || []).length), 1);
  const W = maxF * cell + 2, H = sheetKeys.length * cell + 2;
  const c = new SoftCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#12121f'; ctx.fillRect(0, 0, W, H);
  sheetKeys.forEach((key, row) => {
    const list = sf.cache.get(key) || [];
    if (row % 2) { ctx.fillStyle = '#1e1e30'; ctx.fillRect(0, 1 + row * cell, W, cell); }
    list.forEach((img, f) => {
      ctx.drawImage(img, 1 + f * cell + ((cell - img.width) >> 1), 1 + row * cell + ((cell - img.height) >> 1));
    });
  });
  const buf = encodePNG(c.pixels, W, H, scale);
  fs.writeFileSync(path.join(outDir, name), buf);
  console.log(`  ${name}  ${W * scale}x${H * scale}  ${(buf.length / 1024).toFixed(1)}kb`);
}

const keys = [...sf.cache.keys()];
const pick = prefix => keys.filter(k => k.startsWith(prefix));
grid(pick('player:max'), 26, 5, 'player.png');
grid(pick('enemy:'), 20, 4, 'enemies.png');
grid(pick('boss:'), 66, 2, 'bosses.png');
grid(pick('item:'), 20, 5, 'items.png');
grid(pick('tile:'), 20, 5, 'tiles.png');
grid(pick('prop:'), 36, 3, 'props.png');
console.log('pranchas geradas em', outDir);
