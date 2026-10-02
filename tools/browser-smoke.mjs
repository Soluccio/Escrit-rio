#!/usr/bin/env node
/**
 * browser-smoke.mjs — simula o NAVEGADOR: instala um DOM falso, executa
 * main.js (boot real), roda alguns frames de requestAnimationFrame, dispara
 * teclado/mouse/toque e verifica que nada explodiu no console.
 *   node tools/browser-smoke.mjs
 */
import { installDOM } from './domstub.mjs';

const dom = installDOM();
const errors = [];
const origError = console.error;
console.error = (...a) => { errors.push(a.join(' ')); origError(...a); };
process.on('uncaughtException', e => { errors.push('uncaught: ' + e.message); origError(e); });

await import('../src/main.js');

const game = globalThis.game;
if (!game) { console.error('X window.game nao foi criado'); process.exit(1); }

// ---- roda frames
dom.flushRAF(3);
console.log('> boot OK. estado:', game.state, '| sprites:', game.sprites.stats.sprites, '| audio ctx:', !!game.audio.ctx);

// ---- simula gestos: teclado
const kb = (type, code) => dom.document.dispatch(type, { code, key: code });
kb('keydown', 'Enter');
dom.flushRAF(2);
console.log('> apos ENTER no menu:', game.state);

for (let i = 0; i < 20; i++) {
  kb('keydown', 'ArrowDown'); dom.document.dispatch('keyup', { code: 'ArrowDown' });
  dom.flushRAF(1);
}
kb('keydown', 'Escape'); dom.flushRAF(1);
kb('keydown', 'KeyW'); kb('keydown', 'KeyD'); kb('keydown', 'Space');
dom.flushRAF(30);
kb('keyup', 'KeyW');
console.log('> apos teclado:', game.state, '| player x/y:', game.player ? [Math.round(game.player.x), Math.round(game.player.y)] : 'sem player');

// ---- simula mouse
dom.canvas.dispatch('mousemove', { clientX: 300, clientY: 120 });
dom.canvas.dispatch('mousedown', { clientX: 300, clientY: 120 });
dom.flushRAF(5);
dom.document.dispatch('mouseup', {});
console.log('> apos mouse: mirando em', game.player ? game.player.aimAngle.toFixed(2) : '-');

// ---- simula toque (joysticks virtuais)
if (game.touch) {
  const sticks = dom.get('touch').children;
  if (sticks.length) {
    sticks[0].dispatch('touchstart', { changedTouches: [{ identifier: 1, clientX: 60, clientY: 640 }] });
    sticks[0].dispatch('touchmove', { changedTouches: [{ identifier: 1, clientX: 90, clientY: 620 }] });
    dom.flushRAF(3);
    sticks[0].dispatch('touchend', { changedTouches: [{ identifier: 1, clientX: 90, clientY: 620 }] });
  }
  const touchRoot = dom.get('touch');
  const touchHidden = !!touchRoot && touchRoot.classList.contains('hidden');
  console.log('> controles de toque:', touchRoot.children.length, 'elementos | escondidos no PC:', touchHidden);
  if (!touchHidden) errors.push('overlay de toque visivel num PC sem touch (BUG 4 do playtest)');
}

// ---- dispara SFX e musica de verdade (com o AudioContext falso)
game.audio.resume();
game.audio.sfx('clip'); game.audio.sfx('bossHorn'); game.audio.sfx('coin');
game.audio.music('boss_ceo');
game.music.update(0.5);
console.log('> audio: osciladores criados', dom.audioCalls.oscillators, '| buffers', dom.audioCalls.buffers);

// ---- resize (o main.js registra o listener e reescala o canvas)
dom.document.dispatch('resize', {});

// ---- checagens finais
dom.flushRAF(60);
const snapshot = {
  estado: game.state,
  andar: game.floorN,
  sala: game.room?.type,
  entidades: game.room?.entities.length ?? 0,
  props: game.room?.props.length ?? 0,
  fps: game.loop.fps,
};

if (errors.length) {
  console.error(`X ${errors.length} erros:`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log('> snapshot:', JSON.stringify(snapshot));
console.log('OK — o caminho de navegador executa sem erros');
