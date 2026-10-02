/**
 * touch.test.js — controles de toque (playtest 1, BUG 4).
 *
 * O overlay aparecia em PCs com tela touch / monitores USB / notebooks 2-em-1.
 * A deteccao agora exige pointer coarse E hover none E userAgent movel, e o
 * jogador pode forcar AUTO / TOUCH / TECLADO no menu (localStorage: touchPref).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectTouchDevice, loadTouchPref, saveTouchPref, resolveTouchEnabled,
  TOUCH_PREF_KEY, TOUCH_PREF_LABEL, TouchControls,
} from '../src/ui/TouchControls.js';
import { createHeadlessGame } from '../tools/headless.mjs';
import { memStorage } from '../tools/headless.mjs';

/** Janela falsa: simula media queries + userAgent. */
function fakeWindow({ coarse = false, noHover = false, ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', hasMatchMedia = true } = {}) {
  return {
    matchMedia: hasMatchMedia
      ? (q) => ({ matches: q.includes('coarse') ? coarse : q.includes('hover') ? noHover : false })
      : undefined,
    navigator: { userAgent: ua },
  };
}

const UA = {
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  // Windows 11 com tela touch e notebook 2-em-1: tem touch, mas tambem hover e UA de desktop
  winTouch: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36 Touch',
};

test('no PC o overlay NAO aparece por padrao (mouse, hover, UA desktop)', () => {
  const win = fakeWindow({ coarse: false, noHover: false, ua: UA.windows });
  assert.equal(detectTouchDevice(win), false, 'PC com mouse nao pode ser detectado como toque');
  assert.equal(resolveTouchEnabled(loadTouchPref(null, win), detectTouchDevice(win)), false);
});

test('Windows 11 / 2-em-1 com tela touch (hover + UA desktop) tambem nao aparece', () => {
  const win = fakeWindow({ coarse: false, noHover: false, ua: UA.winTouch });
  assert.equal(detectTouchDevice(win), false, 'tela touch de PC nao basta para o overlay');
});

test('celular e tablet: overlay aparece por padrao (coarse + no-hover + UA movel)', () => {
  for (const ua of [UA.android, UA.iphone, UA.ipad]) {
    const win = fakeWindow({ coarse: true, noHover: true, ua });
    assert.equal(detectTouchDevice(win), true, 'nao detectou: ' + ua.slice(0, 30));
  }
});

test('as TRES condicoes sao obrigatorias (basta uma faltar para nao aparecer)', () => {
  // touch + UA movel, mas com hover (ex.: tablet com mouse conectado)
  assert.equal(detectTouchDevice(fakeWindow({ coarse: true, noHover: false, ua: UA.android })), false);
  // touch + sem hover, mas UA de desktop (console/Chromebook)
  assert.equal(detectTouchDevice(fakeWindow({ coarse: true, noHover: true, ua: UA.windows })), false);
  // UA movel, mas ponteiro fino (emulacao de desktop no celular)
  assert.equal(detectTouchDevice(fakeWindow({ coarse: false, noHover: true, ua: UA.android })), false);
});

test('ambiente sem matchMedia (Node/headless) nao quebra e nao mostra overlay', () => {
  assert.equal(detectTouchDevice(fakeWindow({ hasMatchMedia: false })), false);
  assert.equal(detectTouchDevice(null), false);
  assert.equal(detectTouchDevice(undefined), false);
});

test('preferencia salva na chave touchPref (localStorage)', () => {
  const store = memStorage();
  assert.equal(loadTouchPref(store), 'auto', 'padrao e AUTO');
  saveTouchPref('keyboard', store);
  assert.equal(store.getItem(TOUCH_PREF_KEY), 'keyboard', 'salvou em touchPref');
  assert.equal(loadTouchPref(store), 'keyboard');
  saveTouchPref('touch', store);
  assert.equal(loadTouchPref(store), 'touch');
  // valores invalidos caem em AUTO (nao quebra o jogo)
  store.setItem(TOUCH_PREF_KEY, 'qualquer-coisa');
  assert.equal(loadTouchPref(store), 'auto');
  // storage inexistente/em modo privado nao explode
  assert.equal(loadTouchPref(null), 'auto');
  saveTouchPref('touch', null);
});

test('TECLADO esconde mesmo em celular; TOUCH mostra mesmo no PC', () => {
  assert.equal(resolveTouchEnabled('keyboard', true), false, 'TECLADO vence a deteccao no celular');
  assert.equal(resolveTouchEnabled('touch', false), true, 'TOUCH vence a deteccao no PC');
  assert.equal(resolveTouchEnabled('auto', true), true);
  assert.equal(resolveTouchEnabled('auto', false), false);
});

test('o Game aceita a preferencia e a deteccao injetadas (headless)', () => {
  const store = memStorage();
  saveTouchPref('keyboard', store);
  const { game } = createHeadlessGame({ seed: 1, touchStorage: store, isTouchDevice: true });
  // sem DOM o jogo roda sem overlay; a API de toque precisa existir e respeitar a preferencia
  assert.ok('touch' in game);
  assert.equal(loadTouchPref(store), 'keyboard');
  assert.equal(resolveTouchEnabled('keyboard', true), false);
});

test('os rotulos do menu existem para as tres opcoes', () => {
  assert.equal(TOUCH_PREF_LABEL.auto, 'AUTO');
  assert.equal(TOUCH_PREF_LABEL.touch, 'TOUCH');
  assert.equal(TOUCH_PREF_LABEL.keyboard, 'TECLADO');
});

// ------------------------------------------------------- integracao (DOM falso)
/** Elemento falso minimo para instanciar o overlay sem navegador. */
function fakeEl() {
  const cls = new Set();
  return {
    className: '', textContent: '', dataset: {}, style: {}, children: [],
    classList: {
      toggle(n, on) { const v = on === undefined ? !cls.has(n) : !!on; if (v) cls.add(n); else cls.delete(n); },
      add: n => cls.add(n), remove: n => cls.delete(n), contains: n => cls.has(n),
    },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 116, height: 116 }),
  };
}

function withFakeDocument(fn) {
  const prevDoc = globalThis.document;
  const prevWin = globalThis.addEventListener;
  globalThis.document = { createElement: () => fakeEl() };
  globalThis.addEventListener = () => {};      // o overlay escuta mousemove/mouseup na janela
  try { return fn(); } finally {
    globalThis.document = prevDoc;
    if (prevWin === undefined) delete globalThis.addEventListener;
    else globalThis.addEventListener = prevWin;
  }
}

test('overlay: escondido no PC, aparece com TOUCH e some com TECLADO (e persiste)', () => {
  withFakeDocument(() => {
    const store = memStorage();
    const root = fakeEl();
    const touch = new TouchControls(root, { storage: store, isTouchDevice: false, pref: 'auto' });
    assert.equal(touch.enabled, false, 'AUTO em PC: escondido');
    assert.ok(root.classList.contains('hidden'), 'raiz com a classe hidden');

    // jogador escolhe TOUCH no menu: aparece mesmo no PC
    assert.equal(touch.cyclePref(1), 'touch');
    assert.equal(touch.enabled, true, 'TOUCH mostra no PC');
    assert.ok(!root.classList.contains('hidden'));
    assert.equal(store.getItem(TOUCH_PREF_KEY), 'touch', 'preferencia salva');

    // "recarrega a pagina": a nova instancia le a preferencia salva
    const touch2 = new TouchControls(fakeEl(), { storage: store, isTouchDevice: false });
    assert.equal(touch2.pref, 'touch', 'preferencia sobrevive ao reload');
    assert.equal(touch2.enabled, true);

    // jogador escolhe TECLADO: esconde e persiste
    touch2.cyclePref(1);
    assert.equal(touch2.pref, 'keyboard');
    assert.equal(touch2.enabled, false, 'TECLADO esconde');
    assert.equal(loadTouchPref(store), 'keyboard');
    const touch3 = new TouchControls(fakeEl(), { storage: store, isTouchDevice: true });
    assert.equal(touch3.enabled, false, 'TECLADO continua escondido no celular');
  });
});

test('esconder o overlay nao deixa input de toque preso', () => {
  withFakeDocument(() => {
    const touch = new TouchControls(fakeEl(), { storage: memStorage(), isTouchDevice: false, pref: 'touch' });
    assert.equal(touch.enabled, true);
    // simula dedo pressionando botao e joystick
    touch.buttons.fire = true;
    touch.justButtons.add('fire');
    touch.move.active = true; touch.move.x = 1; touch.move.y = 0;
    // passa para TECLADO
    touch.setPref('keyboard');
    assert.equal(touch.enabled, false);
    assert.equal(touch.move.active, false, 'joystick solto ao esconder');
    assert.equal(touch.isDown('fire'), false, 'botao nao fica preso');
    assert.equal(touch.justPressed('fire'), false);
    // e mesmo com estado sujo, com o overlay desligado nada e reportado
    touch.buttons.fire = true;
    assert.equal(touch.isDown('fire'), false, 'overlay desligado ignora o estado');
  });
});

test('o menu cicla CONTROLES: AUTO -> TOUCH -> TECLADO', () => {
  withFakeDocument(() => {
    const store = memStorage();
    const touch = new TouchControls(fakeEl(), { storage: store, isTouchDevice: false });
    const game = { touch, audio: { ui() {} }, save: { data: {} }, loadRun: () => null };
    const visto = [touch.pref];
    for (let i = 0; i < 3; i++) {
      touch.cyclePref(1);
      visto.push(touch.pref);
    }
    assert.deepEqual(visto, ['auto', 'touch', 'keyboard', 'auto'], 'ciclo completo');
    assert.equal(loadTouchPref(store), 'auto', 'volta para AUTO depois de um ciclo inteiro');
    // rotulo que o menu mostra
    assert.equal('CONTROLES: ' + TOUCH_PREF_LABEL[touch.pref], 'CONTROLES: AUTO');
    assert.ok(game.touch);
  });
});
