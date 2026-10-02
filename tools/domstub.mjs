/**
 * domstub.mjs — stub MINIMO de DOM/WebAudio para executar o caminho de
 * inicializacao do navegador (main.js, Input, TouchControls, Audio) dentro do
 * Node. Pega erros de API/typo que os testes de logica nao pegariam.
 */
import SoftCanvas from './softcanvas.mjs';

class ClassList {
  constructor() { this.set = new Set(); }
  add(...c) { c.forEach(x => this.set.add(x)); }
  remove(...c) { c.forEach(x => this.set.delete(x)); }
  toggle(c, force) { if (force === undefined) force = !this.set.has(c); force ? this.set.add(c) : this.set.delete(c); return force; }
  contains(c) { return this.set.has(c); }
}

class El {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.style = {};
    this.dataset = {};
    this.classList = new ClassList();
    this.listeners = new Map();
    this.textContent = '';
    this._innerHTML = '';
    this.width = 480; this.height = 270;
    this._canvas = tag === 'canvas' ? new SoftCanvas(this.width, this.height) : null;
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) { this._innerHTML = v; if (v === '') this.children = []; }
  appendChild(c) { this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter(x => x !== c); }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  removeEventListener(type, fn) {
    const l = this.listeners.get(type);
    if (l) this.listeners.set(type, l.filter(x => x !== fn));
  }
  dispatch(type, ev = {}) {
    const list = this.listeners.get(type) || [];
    const event = { type, preventDefault() {}, stopPropagation() {}, target: this, ...ev };
    for (const fn of list) fn(event);
    return event;
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 480, height: 270, right: 480, bottom: 270 }; }
  getContext() {
    if (!this._canvas) this._canvas = new SoftCanvas(this.width, this.height);
    return this._canvas.getContext('2d');
  }
  setPointerCapture() {}
  requestFullscreen() { return Promise.resolve(); }
}

export function installDOM() {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new El(id === 'game' ? 'canvas' : 'div'));
    return elements.get(id);
  };
  const canvas = get('game');
  canvas.width = 480; canvas.height = 270;
  const body = new El('body');
  const head = new El('head');

  const documentStub = {
    readyState: 'complete',
    body, head,
    documentElement: new El('html'),
    getElementById: get,
    // PC tipico: ponteiro fino + hover -> o overlay de toque deve ficar escondido
    matchMedia: q => ({ matches: false, media: q, addListener() {}, removeListener() {} }),
    createElement: tag => new El(tag),
    addEventListener: body.addEventListener.bind(body),
    removeEventListener: body.removeEventListener.bind(body),
    dispatch: body.dispatch.bind(body),
  };

  const rafQueue = [];
  // relogio controlado: cada flushRAF avanca 16.7ms (1 frame de 60 FPS)
  let clock = 0;
  const realPerformance = globalThis.performance;
  try {
    globalThis.performance = { now: () => clock, timeOrigin: 0, mark() {}, measure() {} };
  } catch (e) { /* mantem o original */ }
  const global = globalThis;
  global.document = documentStub;
  global.window = global;
  const navStub = { maxTouchPoints: 0, getGamepads: () => [null], userAgent: 'node' };
  try { global.navigator = navStub; } catch (e) { Object.defineProperty(global, 'navigator', { value: navStub, configurable: true }); }
  global.location = { href: 'http://localhost:5173/' };
  global.devicePixelRatio = 1;
  global.innerWidth = 1280;
  global.innerHeight = 720;
  global.addEventListener = (t, fn) => body.addEventListener(t, fn);
  global.removeEventListener = (t, fn) => body.removeEventListener(t, fn);
  global.requestAnimationFrame = fn => { rafQueue.push(fn); return rafQueue.length; };
  global.cancelAnimationFrame = () => {};
  global.localStorage = (() => {
    const m = new Map();
    return {
      getItem: k => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: k => m.delete(k),
      clear: () => m.clear(),
    };
  })();
  // AudioContext falso: registra as chamadas para garantir que o codigo de
  // audio do jogo continua valido (nao valida o som em si)
  const audioCalls = { oscillators: 0, buffers: 0, gains: 0 };
  class FakeParam {
    constructor(v = 0) { this.value = v; }
    setValueAtTime() { return this; }
    linearRampToValueAtTime() { return this; }
    exponentialRampToValueAtTime() { return this; }
  }
  class FakeNode {
    constructor() {
      this.gain = new FakeParam(1);
      this.frequency = new FakeParam(440);
      this.Q = new FakeParam(1);
      this.detune = new FakeParam(0);
      this.type = 'sine';
    }
    connect() { return this; }
    disconnect() {}
    start() { return this; }
    stop() { return this; }
  }
  global.AudioContext = class {
    constructor() {
      this.sampleRate = 44100;
      this.currentTime = 0;
      this.state = 'running';
      this.destination = new FakeNode();
    }
    createGain() { audioCalls.gains++; return new FakeNode(); }
    createOscillator() { audioCalls.oscillators++; return new FakeNode(); }
    createBufferSource() { audioCalls.buffers++; return new FakeNode(); }
    createBiquadFilter() { return new FakeNode(); }
    createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len), length: len }; }
    resume() { this.state = 'running'; }
  };

  return {
    document: documentStub,
    canvas,
    get,
    rafQueue,
    audioCalls,
    /** Roda os callbacks de requestAnimationFrame pendentes (1 "frame" = 16.7ms). */
    flushRAF(times = 1) {
      for (let i = 0; i < times; i++) {
        clock += 1000 / 60;
        const batch = rafQueue.splice(0, rafQueue.length);
        for (const fn of batch) fn(clock);
      }
    },
    get clock() { return clock; },
  };
}

export { El };
