/**
 * RNG.js — PRNG deterministica (mulberry32) com helpers.
 * Toda a geracao procedural usa uma instancia com seed, entao a mesma seed
 * sempre produz o mesmo predio. Seed diaria = dia + horario.
 */
export class RNG {
  constructor(seed = 1) {
    this.seed = RNG.hash(seed);
    this.s = this.seed;
  }

  /** Converte qualquer coisa (string, numero) em semente de 32 bits. */
  static hash(x) {
    if (typeof x === 'number' && Number.isFinite(x)) return (x >>> 0) || 1;
    const str = String(x);
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) || 1;
  }

  /** Seed "dia + horario" — a run de hoje e diferente da de amanha. */
  static dailySeed(d = new Date()) {
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${d.getHours()}`;
    return RNG.hash(key);
  }

  reset() { this.s = this.seed; }

  /** float em [0,1) */
  next() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** inteiro inclusivo em [a,b] */
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }

  /** float em [a,b) */
  range(a, b) { return a + this.next() * (b - a); }

  /** true com probabilidade p */
  chance(p) { return this.next() < p; }

  /** elemento aleatorio */
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }

  /** copia embaralhada (Fisher-Yates) */
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** n elementos unicos */
  sample(arr, n) { return this.shuffle(arr).slice(0, n); }

  /** distribuicao normal aproximada */
  gauss(mean = 0, sd = 1) {
    return mean + (this.next() + this.next() + this.next() + this.next() - 2) * sd;
  }

  /** angulo aleatorio */
  angle() { return this.next() * Math.PI * 2; }

  /** deriva uma sub-semente deterministica (ex: por sala) */
  derive(tag) { return new RNG(this.s ^ RNG.hash(tag)); }
}

/** util: embaralhar array com seed global simples */
export function shuffled(arr, rng) { return rng.shuffle(arr); }
