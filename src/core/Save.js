/**
 * Save.js — progresso persistente em localStorage.
 * Guarda: bencaos vistas, mini-bosses derrotados, finais alcancados,
 * maior combo, melhor tempo, selos de estagio e personagens desbloqueados.
 * Tudo com fallback: se o localStorage nao existir, roda em memoria.
 */
const KEY = 'pilha-de-papel.save.v1';

const DEFAULT = {
  version: 1,
  blessingsSeen: [],        // ids
  bossesDefeated: [],       // ids de mini-bosses
  endings: [],              // 'ceo' | 'ciclo'
  bestCombo: 0,
  bestTime: 0,              // menor tempo de vitoria (s)
  bestFloor: 1,
  runs: 0,
  seals: 0,
  unlockedChars: ['max'],
  selectedChar: 'max',
  muted: false,
  seenSecret: false,
  deaths: 0,
};

export class Save {
  constructor(storage = null) {
    this.storage = storage !== undefined ? storage : (typeof localStorage !== 'undefined' ? localStorage : null);
    this.data = { ...DEFAULT };
    this.load();
  }

  load() {
    if (!this.storage) return this.data;
    try {
      const raw = this.storage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = { ...DEFAULT, ...parsed };
        this.data.unlockedChars = Array.from(new Set([...DEFAULT.unlockedChars, ...(parsed.unlockedChars || [])]));
        if (!this.data.unlockedChars.includes(this.data.selectedChar)) this.data.selectedChar = 'max';
      }
    } catch (e) {
      this.data = { ...DEFAULT };
    }
    return this.data;
  }

  save() {
    if (!this.storage) return false;
    try {
      this.storage.setItem(KEY, JSON.stringify(this.data));
      return true;
    } catch (e) { return false; }
  }

  // ---------------------------------------------------------------- updates
  markBlessing(id) {
    if (!this.data.blessingsSeen.includes(id)) {
      this.data.blessingsSeen.push(id);
      this.save();
      return true;
    }
    return false;
  }

  markBossKill(id) {
    if (!this.data.bossesDefeated.includes(id)) {
      this.data.bossesDefeated.push(id);
      this.save();
      return true;
    }
    return false;
  }

  markEnding(id) {
    if (!this.data.endings.includes(id)) {
      this.data.endings.push(id);
      this.save();
      return true;
    }
    return false;
  }

  /** Fim de run: atualiza records e devolve os selos ganhos. */
  finishRun(run) {
    this.data.runs++;
    if (run.won) {
      if (!this.data.bestTime || run.time < this.data.bestTime) this.data.bestTime = run.time;
    } else {
      this.data.deaths++;
    }
    this.data.bestFloor = Math.max(this.data.bestFloor, run.floor);
    this.data.bestCombo = Math.max(this.data.bestCombo, run.maxCombo || 0);
    this.data.seals += run.seals || 0;
    if (run.ending) this.markEnding(run.ending);
    this.save();
    return this.data;
  }

  canUnlock(charDef) { return this.data.seals >= charDef.cost; }

  unlockChar(id, cost) {
    if (this.data.unlockedChars.includes(id)) return true;
    if (this.data.seals < cost) return false;
    this.data.seals -= cost;
    this.data.unlockedChars.push(id);
    this.save();
    return true;
  }

  toggleMute() {
    this.data.muted = !this.data.muted;
    this.save();
    return this.data.muted;
  }

  reset() {
    this.data = { ...DEFAULT };
    this.save();
  }
}

/** Memoria falsa para testes headless. */
export function memoryStorage() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
  };
}
