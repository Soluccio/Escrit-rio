/**
 * Viewport.js — encaixe do canvas na janela (escala inteira, pixel art nitido).
 * Fica separado do Game.js (que e logica pura de jogo) para o arquivo caber na
 * regra de 400 linhas e para o main.js ser o unico dono do DOM.
 */
import { VIEW_W, VIEW_H } from '../data/constants.js';

/** Ajusta o tamanho do canvas mantendo o aspecto. Retorna a escala usada. */
export function fitCanvas(canvas, viewW = VIEW_W, viewH = VIEW_H) {
  if (!canvas || typeof innerWidth === 'undefined') return 1;
  const scale = Math.max(1, Math.floor(Math.min(innerWidth / viewW, innerHeight / viewH)));
  canvas.style.width = viewW * scale + 'px';
  canvas.style.height = viewH * scale + 'px';
  return scale;
}
