/**
 * headless.mjs — roda o jogo inteiro dentro do Node, sem navegador:
 * canvas em software (softcanvas.mjs) + input programavel.
 * Base para os testes (node:test) e para a ferramenta de screenshot.
 */
import SoftCanvas from './softcanvas.mjs';
import { Game } from '../src/core/Game.js';
import { RNG } from '../src/core/RNG.js';

export { SoftCanvas };

/** Input falso: o teste escreve em .axes/.press/.downs e o jogo le. */
export class FakeInput {
  constructor() {
    this.move = { x: 0, y: 0 };
    this.aimDir = { x: 1, y: 0 };
    this.mouse = { x: 240, y: 135, down: false, justDown: false };
    this.keys = new Set();
    this.held = new Set();
    this.just = new Set();
    this.anyKey = false;
    this.lastInputDevice = 'pad';
    this.padJust = new Set();
  }
  /** Marca uma acao como pressionada neste frame. */
  press(action) { this.just.add(action); }
  hold(action, on = true) { if (on) this.held.add(action); else this.held.delete(action); }
  down(action) { return this.held.has(action); }
  pressed(action) { return this.just.has(action); }
  axis() {
    const { x, y } = this.move;
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len, len: 1 } : { x, y, len };
  }
  aim() { return { x: this.aimDir.x, y: this.aimDir.y, source: 'pad' }; }
  endFrame() { this.just.clear(); this.mouse.justDown = false; this.anyKey = false; this.padJust.clear(); }
}

/** Storage em memoria (sem localStorage no Node). */
export function memStorage() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    _map: map,
  };
}

/**
 * Cria um jogo headless pronto para rodar.
 * @param {object} opts {seed, character, state}
 */
export function createHeadlessGame(opts = {}) {
  const canvas = new SoftCanvas(480, 270);
  const ctx = canvas.getContext('2d');
  const input = new FakeInput();
  const storage = opts.storage || memStorage();
  const game = new Game({
    canvas, ctx, input, storage,
    touch: false,
    seed: opts.seed ?? 4242,
    canvasFactory: (w, h) => new SoftCanvas(w, h),
  });
  if (opts.character) {
    game.save.data.unlockedChars = [...new Set([...game.save.data.unlockedChars, opts.character])];
    game.save.data.selectedChar = opts.character;
  }
  return { game, canvas, ctx, input, storage };
}

/** Inicia a run direto (pula menu/transicao). */
export function startRun(game, seed = null, character = null) {
  game.director.startRun(seed, character);
  game.state = 'PLAY';
  return game;
}

/** Roda N passos de simulacao + render, capturando erros. */
export function runFrames(game, frames, onFrame = null) {
  const errors = [];
  for (let i = 0; i < frames; i++) {
    try {
      game.loop.step(1);
      game.draw();
      if (onFrame) onFrame(i, game);
    } catch (e) {
      errors.push({ frame: i, error: e });
      if (errors.length > 3) break;
    }
  }
  return errors;
}

export { Game, RNG };
