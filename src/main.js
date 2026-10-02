/**
 * main.js — ponto de entrada: cria o canvas, instancia o Game, liga os
 * listeners de resize/audio e comeca o loop de 60 FPS.
 */
import { Game } from './core/Game.js';
import { VIEW_W, VIEW_H } from './data/constants.js';

function boot() {
  const canvas = document.getElementById('game');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;

  const game = new Game({ canvas, ctx, touchContainer: document.getElementById('touch') });
  window.game = game;   // debug no console

  const resize = () => {
    const scale = Math.max(1, Math.min(
      (innerWidth - 8) / VIEW_W, (innerHeight - 8) / VIEW_H,
    ));
    const rounded = Math.floor(scale * 2) / 2;   // meios passos para encaixar melhor
    canvas.style.width = Math.floor(VIEW_W * rounded) + 'px';
    canvas.style.height = Math.floor(VIEW_H * rounded) + 'px';
  };
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
