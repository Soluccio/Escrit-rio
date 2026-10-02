/**
 * enemies.js — ficha tecnica de cada inimigo comum.
 * sprite: chave usada pelo SpriteFactory | arch: arquetipo de IA (ver Enemy.js)
 */
export const ENEMIES = {
  papel: {
    name: 'Pilha de Papel', sprite: 'papel', size: 16, hp: 6, speed: 30, dmg: 1, arch: 'rusher',
    sight: 210, atkRange: 24, telegraph: 0.35, cooldown: 1.1, posture: 26, coins: 2, score: 5,
    particles: 'paper', sfx: 'paper',
  },
  grampeador: {
    name: 'Grampeador', sprite: 'grampeador', size: 16, hp: 11, speed: 44, dmg: 1, arch: 'rusher',
    sight: 200, atkRange: 20, telegraph: 0.32, cooldown: 1.0, posture: 34, coins: 3, score: 8,
    particles: 'spark', sfx: 'staple', hop: true,
  },
  telefone: {
    name: 'Telefone', sprite: 'telefone', size: 16, hp: 8, speed: 26, dmg: 1, arch: 'ranged',
    sight: 240, atkRange: 150, preferred: 86, telegraph: 0.5, cooldown: 2.0, posture: 22,
    coins: 3, score: 10, projectile: 'soundwave', projSpeed: 130, projCount: 1, particles: 'spark',
    sfx: 'ring', immuneSound: true,
  },
  planilha: {
    name: 'Planilha', sprite: 'planilha', size: 16, hp: 9, speed: 22, dmg: 1, arch: 'ranged',
    sight: 230, atkRange: 170, preferred: 96, telegraph: 0.45, cooldown: 2.2, posture: 24,
    coins: 3, score: 12, projectile: 'number', projSpeed: 150, projCount: 3, arc: 0.5, particles: 'paper',
    sfx: 'print',
  },
  formulario: {
    name: 'Formulario Vivo', sprite: 'formulario', size: 16, hp: 4, speed: 38, dmg: 1, arch: 'swarm',
    sight: 200, atkRange: 22, telegraph: 0.3, cooldown: 1.3, posture: 12, coins: 2, score: 6,
    particles: 'paper', sfx: 'paper', splits: 2, splitGen: 2,
  },
  burocrata: {
    name: 'Burocrata', sprite: 'burocrata', size: 24, hp: 22, speed: 20, dmg: 2, arch: 'tank',
    sight: 190, atkRange: 34, telegraph: 0.6, cooldown: 2.4, posture: 60, coins: 6, score: 20,
    particles: 'paper', sfx: 'stamp', aoe: 40,
  },
  bug: {
    name: 'Bug', sprite: 'bug', size: 16, hp: 3, speed: 68, dmg: 1, arch: 'swarm',
    sight: 260, atkRange: 18, telegraph: 0.25, cooldown: 0.9, posture: 8, coins: 1, score: 4,
    particles: 'digital', sfx: 'bug', zigzag: true,
  },
  bug_elite: {
    name: 'Bug Ancestral', sprite: 'bug', size: 16, hp: 12, speed: 34, dmg: 2, arch: 'sniper',
    sight: 300, atkRange: 240, telegraph: 1.0, cooldown: 2.6, posture: 30, coins: 6, score: 24,
    projectile: 'bug', projSpeed: 190, projCount: 3, burst: 0.14, elite: true, scale: 1.35,
    particles: 'digital', sfx: 'bug',
  },
  cafe: {
    name: 'Cafe Derramado', sprite: 'cafe', size: 16, hp: 7, speed: 18, dmg: 1, arch: 'support',
    sight: 220, atkRange: 120, telegraph: 0.4, cooldown: 2.4, posture: 20, coins: 3, score: 9,
    hazard: 'coffee', particles: 'coffee', sfx: 'coffee',
  },
  cabo: {
    name: 'Cabo Emaranhado', sprite: 'cabo', size: 16, hp: 17, speed: 24, dmg: 1, arch: 'tank',
    sight: 200, atkRange: 30, telegraph: 0.55, cooldown: 2.2, posture: 46, coins: 5, score: 16,
    particles: 'spark', sfx: 'cable', slow: 0.45,
  },
  fantasma: {
    name: 'Estagiario Fantasma', sprite: 'fantasma', size: 16, hp: 10, speed: 40, dmg: 1, arch: 'support',
    sight: 250, atkRange: 40, telegraph: 0.45, cooldown: 2.0, posture: 26, coins: 4, score: 14,
    particles: 'spark', sfx: 'ghost', blink: true,
  },
};

/** Aplica escala de dificuldade do andar em uma copia da ficha. */
export function scaleEnemy(key, scale) {
  const base = ENEMIES[key];
  if (!base) throw new Error('inimigo desconhecido: ' + key);
  return {
    ...base, key,
    hp: Math.round(base.hp * scale.hp),
    dmg: base.dmg + scale.damage - 1,
    speed: base.speed * scale.speed,
  };
}
