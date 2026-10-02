/**
 * Music.js — trilha generativa: piano corporativo em escala menor + taiko,
 * com camadas que entram conforme a INTENSIDADE (inimigos na tela).
 * Cada andar tem seu tema (data/audio-map.js) e cada boss tem o seu.
 *
 * O agendador roda por tempo (lookahead de 0.4s) e nunca depende de assets.
 */
import { MUSIC, noteFreq } from '../data/audio-map.js';

const AHEAD = 0.5;         // agenda 0.5s a frente

export class Music {
  constructor(audio) {
    this.audio = audio;
    this.themeName = null;
    this.theme = null;
    this.intensity = 0;         // 0..1 (inimigos vivos na tela)
    this.targetIntensity = 0;
    this.step = 0;
    this.nextTime = 0;
    this.playing = false;
    this.timer = null;
    this.bpmScale = 1;
    this.enabled = true;
  }

  /** Troca de tema (andar/boss/menu). */
  play(name, opts = {}) {
    const theme = MUSIC[name];
    if (!theme) return;
    if (this.themeName === name && this.playing) return;
    this.themeName = name;
    this.theme = theme;
    this.step = 0;
    this.bpmScale = opts.bpmScale || 1;
    this.nextTime = this.audio.ctx ? this.audio.ctx.currentTime + 0.1 : 0;
    this.playing = true;
    this.enabled = true;
  }

  stop() { this.playing = false; this.theme = null; this.themeName = null; }

  /** Intensidade vem do jogo: 0 = explorando, 1 = sala cheia/boss. */
  setIntensity(v) { this.targetIntensity = Math.max(0, Math.min(1, v)); }

  /** Deve ser chamado todo frame (usa o tempo do AudioContext). */
  update(dt) {
    if (!this.audio.enabled || !this.audio.ctx) return;
    this.intensity += (this.targetIntensity - this.intensity) * Math.min(1, dt * 1.5);
    if (!this.playing || !this.theme) return;
    const ctx = this.audio.ctx;
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + AHEAD) {
      this._scheduleStep(this.nextTime);
      const beat = 60 / (this.theme.bpm * this.bpmScale);
      this.nextTime += beat / 2;      // colcheias
      this.step++;
    }
  }

  _scheduleStep(t) {
    const theme = this.theme;
    const s = this.step;
    const bar = Math.floor(s / 8) % 4;
    const layers = theme.layers;
    const inten = this.intensity;

    // ---------------------------------------------------------------- piano
    if (layers.includes('piano')) {
      if (s % 8 === 0 || (s % 8 === 3 && inten > 0.35) || (s % 8 === 6 && inten > 0.6)) {
        const deg = [0, 4, 2, 5, 3, 6, 1, 4][(bar * 3 + (s % 8)) % 8];
        this._pluck(t, noteFreq(theme, deg, 0), 0.22 + inten * 0.1, 'triangle', 0.9);
      }
      if (inten > 0.5 && s % 8 === 7) this._pluck(t, noteFreq(theme, 7, 0), 0.14, 'triangle', 0.5);
    }
    // ---------------------------------------------------------------- baixo
    if (layers.includes('bass')) {
      if (s % 4 === 0) {
        const deg = bar === 3 ? 4 : 0;
        this._bassNote(t, noteFreq(theme, deg, -2), 0.22 + inten * 0.12);
      }
    }
    // ---------------------------------------------------------------- arpejo
    if (layers.includes('arp') && inten > 0.15) {
      if (s % 2 === 0) {
        const deg = (s / 2) % 6 + (bar % 2) * 2;
        this._pluck(t, noteFreq(theme, deg, 1), 0.08 + inten * 0.06, 'square', 0.3 + inten * 0.3);
      }
    }
    // ---------------------------------------------------------------- bipes (TI)
    if (layers.includes('bips') && inten > 0.3) {
      if (s % 4 === 2) this._bip(t, noteFreq(theme, 4, 2), 0.06);
    }
    // ---------------------------------------------------------------- teclado mecanico (RH)
    if (layers.includes('keys') && inten > 0.25) {
      if (s % 2 === 1) this._click(t, 0.05 + inten * 0.04);
    }
    // ---------------------------------------------------------------- coral (CEO)
    if (layers.includes('choir') && inten > 0.25) {
      if (s % 8 === 0) {
        this._choir(t, noteFreq(theme, 0, 0), 2.0);
        this._choir(t, noteFreq(theme, 2, 0), 2.0);
        this._choir(t, noteFreq(theme, 4, -1), 2.0);
      }
    }
    // ---------------------------------------------------------------- taiko
    if (layers.includes('taiko') || theme.drums === 'epic') {
      if (s % 4 === 0) this._taiko(t, 0.3 + inten * 0.25);
      if (theme.drums === 'hard' || theme.drums === 'epic') {
        if (s % 4 === 2) this._taiko(t, 0.2 + inten * 0.15, 1.5);
      }
    }
    // ---------------------------------------------------------------- bateria suave
    if (theme.drums === 'soft' && s % 4 === 2 && inten > 0.2) this._taiko(t, 0.1 + inten * 0.05, 2);
    if (theme.drums === 'mid' && s % 2 === 1 && inten > 0.15) this._click(t, 0.05);

    // ambiente de andar (fax, telefone)
    if (theme.ambient === 'fax' && s % 32 === 16) this._ambientNoise(t);
    if (theme.ambient === 'phone' && s % 24 === 8 && inten < 0.4) this._phone(t);
  }

  // ------------------------------------------------------------------ vozes
  _pluck(t, freq, gain, type = 'triangle', dur = 1) {
    const ctx = this.audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain * 0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4 * dur);
    osc.connect(g); g.connect(this.audio.musicGain);
    osc.start(t); osc.stop(t + 0.5 * dur);
  }

  _bassNote(t, freq, gain) {
    const ctx = this.audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain * 0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    osc.connect(g); g.connect(this.audio.musicGain);
    osc.start(t); osc.stop(t + 0.5);
  }

  _bip(t, freq, gain) {
    const ctx = this.audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc.connect(g); g.connect(this.audio.musicGain);
    osc.start(t); osc.stop(t + 0.1);
  }

  _click(t, gain) {
    const ctx = this.audio.ctx;
    if (!this.audio.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.audio.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 2200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(f); f.connect(g); g.connect(this.audio.musicGain);
    src.start(t); src.stop(t + 0.06);
  }

  _taiko(t, gain, pitch = 1) {
    const ctx = this.audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(50 * pitch, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain * 0.5, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(g); g.connect(this.audio.musicGain);
    osc.start(t); osc.stop(t + 0.32);
  }

  _choir(t, freq, dur) {
    const ctx = this.audio.ctx;
    for (let d = 0; d < 2; d++) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq * (1 + (d ? 0.004 : -0.004));
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      osc.connect(f); f.connect(g); g.connect(this.audio.musicGain);
      osc.start(t); osc.stop(t + dur + 0.05);
    }
  }

  _ambientNoise(t) {
    // "fax distante"
    const ctx = this.audio.ctx;
    if (!this.audio.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.audio.noiseBuffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.03, t + 0.15);
    g.gain.linearRampToValueAtTime(0, t + 0.7);
    src.connect(f); f.connect(g); g.connect(this.audio.musicGain);
    src.start(t); src.stop(t + 0.8);
  }

  _phone(t) {
    this._bip(t, 880, 0.05);
    this._bip(t + 0.12, 1100, 0.05);
  }
}
