/**
 * enemies.js — ficha tecnica de cada inimigo comum.
 * sprite: chave usada pelo SpriteFactory | arch: arquetipo de IA (ver Enemy.js)
 *
 * TAMANHO: `size` e a hitbox AABB (px de mundo) e `spriteSize` o canvas do
 * sprite pre-renderizado. Desde o playtest 1 os bichos sao 24x24 (36x36 o
 * burocrata) — a arte 16x16/24x24 e ampliada em 1.5x ao gerar o sprite. A
 * hitbox (20) fica levemente menor que o sprite (24) para o combate continuar
 * justo: o player tem 12x14 e precisa conseguir esquivar.
 *
 * AGRESSAO: `sight` alto (>= 220) e `cooldown` curto (0.8-1.0s rusher,
 * 1.2-1.6s ranged) mantem os inimigos atacando em vez de so olhar.
 */
export const ENEMIES = {
  papel: {
    name: 'Pilha de Papel', sprite: 'papel', size: 20, spriteSize: 24, hp: 6, speed: 58, dmg: 1, arch: 'rusher',
    sight: 240, atkRange: 24, telegraph: 0.35, cooldown: 0.9, posture: 26, coins: 2, score: 5,
    particles: 'paper', sfx: 'paper',
  },
  grampeador: {
    name: 'Grampeador', sprite: 'grampeador', size: 20, spriteSize: 24, hp: 11, speed: 66, dmg: 1, arch: 'rusher',
    sight: 235, atkRange: 22, telegraph: 0.32, cooldown: 0.85, posture: 34, coins: 3, score: 8,
    particles: 'spark', sfx: 'staple', hop: true,
  },
  telefone: {
    name: 'Telefone', sprite: 'telefone', size: 20, spriteSize: 24, hp: 8, speed: 44, dmg: 1, arch: 'ranged',
    sight: 260, atkRange: 150, preferred: 86, telegraph: 0.5, cooldown: 1.4, posture: 22,
    coins: 3, score: 10, projectile: 'soundwave', projSpeed: 130, projCount: 1, particles: 'spark',
    sfx: 'ring', immuneSound: true,
  },
  planilha: {
    name: 'Planilha', sprite: 'planilha', size: 20, spriteSize: 24, hp: 9, speed: 40, dmg: 1, arch: 'ranged',
    sight: 255, atkRange: 175, preferred: 96, telegraph: 0.45, cooldown: 1.5, posture: 24,
    coins: 3, score: 12, projectile: 'number', projSpeed: 150, projCount: 3, arc: 0.5, particles: 'paper',
    sfx: 'print',
  },
  formulario: {
    name: 'Formulario Vivo', sprite: 'formulario', size: 20, spriteSize: 24, hp: 4, speed: 62, dmg: 1, arch: 'swarm',
    sight: 230, atkRange: 24, telegraph: 0.3, cooldown: 1.0, posture: 12, coins: 2, score: 6,
    particles: 'paper', sfx: 'paper', splits: 2, splitGen: 2,
  },
  burocrata: {
    name: 'Burocrata', sprite: 'burocrata', size: 28, spriteSize: 36, hp: 22, speed: 44, dmg: 2, arch: 'tank',
    sight: 220, atkRange: 34, telegraph: 0.6, cooldown: 1.8, posture: 60, coins: 6, score: 20,
    particles: 'paper', sfx: 'stamp', aoe: 40,
  },
  bug: {
    name: 'Bug', sprite: 'bug', size: 20, spriteSize: 24, hp: 3, speed: 86, dmg: 1, arch: 'swarm',
    sight: 250, atkRange: 20, telegraph: 0.25, cooldown: 0.8, posture: 8, coins: 1, score: 4,
    particles: 'digital', sfx: 'bug', zigzag: true,
  },
  bug_elite: {
    name: 'Bug Ancestral', sprite: 'bug', size: 20, spriteSize: 24, hp: 12, speed: 52, dmg: 2, arch: 'sniper',
    sight: 300, atkRange: 240, telegraph: 0.9, cooldown: 1.8, posture: 30, coins: 6, score: 24,
    projectile: 'bug', projSpeed: 190, projCount: 3, burst: 0.14, elite: true, scale: 1.35,
    particles: 'digital', sfx: 'bug',
  },
  cafe: {
    name: 'Cafe Derramado', sprite: 'cafe', size: 20, spriteSize: 24, hp: 7, speed: 38, dmg: 1, arch: 'support',
    sight: 240, atkRange: 120, telegraph: 0.4, cooldown: 1.6, posture: 20, coins: 3, score: 9,
    hazard: 'coffee', particles: 'coffee', sfx: 'coffee',
  },
  cabo: {
    name: 'Cabo Emaranhado', sprite: 'cabo', size: 20, spriteSize: 24, hp: 17, speed: 48, dmg: 1, arch: 'tank',
    sight: 230, atkRange: 30, telegraph: 0.55, cooldown: 1.6, posture: 46, coins: 5, score: 16,
    particles: 'spark', sfx: 'cable', slow: 0.45,
  },
  fantasma: {
    name: 'Estagiario Fantasma', sprite: 'fantasma', size: 20, spriteSize: 24, hp: 10, speed: 66, dmg: 1, arch: 'support',
    sight: 250, atkRange: 44, telegraph: 0.45, cooldown: 1.4, posture: 26, coins: 4, score: 14,
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
    // teto de +1: com 3 coracoes, levar 3 de dano de um inimigo comum seria morte instantanea
    dmg: Math.min(base.dmg + scale.damage - 1, base.dmg + 1),
    speed: base.speed * scale.speed,
  };
}
