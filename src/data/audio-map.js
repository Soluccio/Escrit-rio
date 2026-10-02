/**
 * audio-map.js — definicao das notas/SFX procedurais (Web Audio).
 * Cada andar tem escala e camadas; a intensidade sobe quando ha inimigos.
 */
export const SFX = {
  clip:      { type: 'noise', dur: 0.06, freq: 1400, gain: 0.25, sweep: -600 },
  staple:    { type: 'square', dur: 0.08, freq: 320, gain: 0.3, sweep: -160 },
  paper:     { type: 'noise', dur: 0.14, freq: 2600, gain: 0.22, sweep: -1400 },
  ring:      { type: 'square', dur: 0.25, freq: 880, gain: 0.22, trill: true },
  bug:       { type: 'square', dur: 0.14, freq: 1200, gain: 0.24, sweep: 900, bits: true },
  coffee:    { type: 'noise', dur: 0.18, freq: 900, gain: 0.25, sweep: -500 },
  coin:      { type: 'square', dur: 0.09, freq: 1180, gain: 0.22, arp: [0, 4, 7] },
  hurt:      { type: 'sawtooth', dur: 0.22, freq: 240, gain: 0.35, sweep: -140 },
  death:     { type: 'sawtooth', dur: 0.5, freq: 300, gain: 0.3, sweep: -260, wobble: true },
  bossHorn:  { type: 'sawtooth', dur: 0.9, freq: 130, gain: 0.4, sweep: 90 },
  ceoRoar:   { type: 'sawtooth', dur: 1.1, freq: 90, gain: 0.45, sweep: 40, dist: true },
  elevator:  { type: 'sine', dur: 0.5, freq: 660, gain: 0.3, ding: true },
  dash:      { type: 'noise', dur: 0.12, freq: 700, gain: 0.2, sweep: 700 },
  pickup:    { type: 'square', dur: 0.12, freq: 720, gain: 0.22, arp: [0, 7] },
  heal:      { type: 'sine', dur: 0.4, freq: 520, gain: 0.28, arp: [0, 4, 7, 12] },
  blessing:  { type: 'sine', dur: 0.6, freq: 440, gain: 0.28, arp: [0, 4, 7, 12, 16] },
  execute:   { type: 'square', dur: 0.35, freq: 180, gain: 0.4, sweep: -80, crunch: true },
  click:     { type: 'square', dur: 0.05, freq: 900, gain: 0.2 },
  secret:    { type: 'sine', dur: 0.7, freq: 330, gain: 0.26, arp: [0, 5, 9, 12] },
  ghost:     { type: 'sine', dur: 0.4, freq: 420, gain: 0.2, sweep: 260, wobble: true },
  cable:     { type: 'sawtooth', dur: 0.16, freq: 200, gain: 0.26, sweep: 600, bits: true },
  stamp:     { type: 'noise', dur: 0.12, freq: 400, gain: 0.35, sweep: -200 },
  print:     { type: 'noise', dur: 0.3, freq: 1800, gain: 0.18, trill: true },
};

/** Escalas (semitons a partir da fundamental) por tema de andar. */
export const MUSIC = {
  lobby:   { root: 220.0, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 72, layers: ['piano', 'bass', 'ambient'],
             drums: 'soft', ambient: 'fax' },
  sales:   { root: 233.1, scale: [0, 2, 3, 5, 7, 9, 10], bpm: 84, layers: ['piano', 'bass', 'arp'], drums: 'soft' },
  hr:      { root: 207.7, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 92, layers: ['piano', 'bass', 'keys'], drums: 'mid' },
  meeting: { root: 196.0, scale: [0, 1, 3, 5, 7, 8, 10], bpm: 96, layers: ['piano', 'bass', 'keys'], drums: 'mid' },
  it:      { root: 246.9, scale: [0, 2, 3, 5, 7, 9, 11], bpm: 118, layers: ['bass', 'bips', 'arp'], drums: 'hard' },
  ceo:     { root: 174.6, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 104, layers: ['choir', 'taiko', 'bass'], drums: 'epic' },
  boss_recep:  { root: 233.1, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 108, layers: ['bass', 'arp', 'taiko'], drums: 'mid' },
  boss_vendas: { root: 246.9, scale: [0, 2, 3, 5, 7, 9, 11], bpm: 116, layers: ['bass', 'arp', 'taiko'], drums: 'mid' },
  boss_rh:     { root: 220.0, scale: [0, 1, 3, 5, 7, 8, 10], bpm: 112, layers: ['bass', 'choir', 'taiko'], drums: 'mid' },
  boss_reuniao:{ root: 196.0, scale: [0, 2, 3, 5, 7, 9, 10], bpm: 120, layers: ['bass', 'arp', 'taiko'], drums: 'hard' },
  boss_ti:     { root: 261.6, scale: [0, 2, 3, 6, 7, 9, 11], bpm: 128, layers: ['bass', 'bips', 'taiko'], drums: 'hard' },
  boss_ceo:    { root: 174.6, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 126, layers: ['choir', 'taiko', 'bass'], drums: 'epic' },
  menu:    { root: 220.0, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 68, layers: ['piano', 'ambient'], drums: 'soft' },
  victory: { root: 261.6, scale: [0, 2, 4, 5, 7, 9, 11], bpm: 88, layers: ['choir', 'piano', 'taiko'], drums: 'epic' },
};

/** Converte grau da escala + oitava em frequencia. */
export function noteFreq(theme, degree, octave = 0) {
  const len = theme.scale.length;
  const idx = ((degree % len) + len) % len;
  const oct = Math.floor(degree / len) + octave;
  const semi = theme.scale[idx] + oct * 12;
  return theme.root * Math.pow(2, semi / 12);
}
