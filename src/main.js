/**
 * main.js — ponto de entrada: cria o canvas, instancia o Game, liga os
 * listeners de resize/audio e comeca o loop de 60 FPS.
 */
import { Game } from './core/Game.js';
import { fitCanvas } from './ui/Viewport.js';
import { VIEW_W, VIEW_H } from './data/constants.js';

function boot() {
  const canvas = document.getElementById('game');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;

  const game = new Game({ canvas, ctx, touchContainer: document.getElementById('touch') });
  window.game = game;   // debug no console

  // escala inteira: pixel art nitido em qualquer monitor
  const resize = () => fitCanvas(canvas);
  addEventListener('resize', resize);
  resize();

  // audio so liga depois de um gesto do usuario
  const unlock = () => {
    game.audio.resume();
    removeEventListener('pointerdown', unlock);
    removeEventListener('keydown', unlock);
    removeEventListener('touchstart', unlock);
  };
  addEventListener('pointerdown', unlock);
  addEventListener('keydown', unlock);
  addEventListener('touchstart', unlock);

  // pausa automatica ao perder o foco
  addEventListener('blur', () => {
    if (game.state === 'PLAY') game.togglePause();
  });

  game.start();
}

if (document.readyState === 'loading') {
  addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
