/**
 * Audio.js — SFX 100% procedurais com Web Audio API (zero arquivos).
 * O AudioContext e criado/retomado no primeiro clique/toque do usuario.
 * Volumes ficam entre 0.2 e 0.5 conforme o design.
 */
import { SFX } from '../data/audio-map.js';

export class Audio {
  constructor(opts = {}) {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.enabled = opts.enabled !== false;
    this.volume = opts.volume ?? 0.7;
    this.musicVolume = 0.35;
    this.sfxVolume = 0.5;
    this.lastPlayed = new Map();
    this.noiseBuffer = null;
  }

  /** Cria o contexto (chamado no primeiro gesto do usuario). */
  init() {
    if (this.ctx || !this.enabled) return this.ctx;
    const AC = typeof AudioContext !== 'undefined' ? AudioContext
      : typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null;
    if (!AC) { this.enabled = false; return null; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.master);
    this._buildNoise();
    return this.ctx;
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(muted) {
    this.enabled = !muted;
    if (this.master) this.master.gain.value = muted ? 0 : this.volume;
    if (!muted) this.init();
  }

  get muted() { return !this.enabled; }

  _buildNoise() {
    const len = Math.floor(this.ctx.sampleRate * 0.6);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
  }

  /** Toca um SFX do mapa de audio. */
  sfx(name, opts = {}) {
    if (!this.enabled || !this.ctx) return;
    const def = SFX[name];
    if (!def) return;
    // anti-spam: mesmo som no mesmo frame nao se sobrepoe
    const now = this.ctx.currentTime;
    const last = this.lastPlayed.get(name) || 0;
    if (now - last < 0.03) return;
    this.lastPlayed.set(name, now);

    const gainValue = (opts.volume ?? 1) * (def.gain || 0.25);
    const pitch = opts.pitch ?? 1;
    const dur = def.dur || 0.1;
    if (def.type === 'noise') this._noise(def, gainValue, pitch, dur);
    else this._tone(def, gainValue, pitch, dur);

    if (def.arp) this._arp(def, gainValue, pitch);
    if (def.trill) this._trill(def, gainValue, pitch);
    if (def.ding) this._ding(def, gainValue, pitch);
    if (def.wobble) this._wobble(def, gainValue, pitch);
    if (def.bits) this._bits(def, gainValue, pitch);
    if (def.crunch) this._crunch(def, gainValue, pitch);
  }

  _env(node, gainValue, dur, attack = 0.005) {
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gainValue, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g);
    g.connect(this.sfxGain);
    return g;
  }

  _noise(def, gainValue, pitch, dur) {
    if (!this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime((def.freq || 1000) * pitch, this.ctx.currentTime);
    if (def.sweep) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(80, (def.freq || 1000) + def.sweep), this.ctx.currentTime + dur);
    }
    src.connect(filter);
    this._env(filter, gainValue, dur);
    src.start();
    src.stop(this.ctx.currentTime + dur + 0.05);
  }

  _tone(def, gainValue, pitch, dur) {
    const osc = this.ctx.createOscillator();
    osc.type = def.type || 'square';
    const freq = (def.freq || 440) * pitch;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (def.sweep) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(40, freq + def.sweep), this.ctx.currentTime + dur);
    }
    this._env(osc, gainValue, dur);
    osc.start();
    osc.stop(this.ctx.currentTime + dur + 0.05);
  }

  _arp(def, gainValue, pitch) {
    const notes = def.arp;
    notes.forEach((semi, i) => {
      const t = this.ctx.currentTime + i * 0.045;
      const osc = this.ctx.createOscillator();
      osc.type = def.type === 'noise' ? 'square' : def.type;
      osc.frequency.value = (def.freq || 440) * pitch * Math.pow(2, semi / 12);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gainValue * 0.8, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(t); osc.stop(t + 0.15);
    });
  }

  _trill(def, gainValue, pitch) {
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    const t = this.ctx.currentTime;
    const base = (def.freq || 800) * pitch;
    osc.frequency.setValueAtTime(base, t);
    for (let i = 0; i < 8; i++) {
      osc.frequency.setValueAtTime(base * (i % 2 ? 1.25 : 1), t + i * 0.032);
    }
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gainValue * 0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.32);
  }

  _ding(def, gainValue, pitch) {
    [0, 7, 12].forEach((semi, i) => {
      const t = this.ctx.currentTime + i * 0.06;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = (def.freq || 660) * pitch * Math.pow(2, semi / 12);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gainValue * 0.6, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(t); osc.stop(t + 0.5);
    });
  }

  _wobble(def, gainValue, pitch) {
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 14;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 20;
    const osc = this.ctx.createOscillator();
    osc.type = def.type || 'sawtooth';
    osc.frequency.value = (def.freq || 300) * pitch;
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
    this._env(osc, gainValue * 0.5, def.dur || 0.4);
    lfo.start(); osc.start();
    lfo.stop(this.ctx.currentTime + (def.dur || 0.4));
    osc.stop(this.ctx.currentTime + (def.dur || 0.4));
  }

  _bits(def, gainValue, pitch) {
    for (let i = 0; i < 5; i++) {
      const t = this.ctx.currentTime + i * 0.035;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = (def.freq || 900) * pitch * (1 + (i % 3) * 0.3);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gainValue * 0.4, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(t); osc.stop(t + 0.05);
    }
  }

  _crunch(def, gainValue, pitch) {
    this._noise({ freq: 300, sweep: -180, dur: 0.5 }, gainValue * 0.6, pitch, 0.5);
    this._tone({ type: 'sawtooth', freq: 90, sweep: -40 }, gainValue * 0.5, pitch, 0.5);
  }

  /** SFX de UI (click curto). */
  ui() { this.sfx('click'); }
}
