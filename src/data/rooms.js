/**
 * rooms.js — pesos de tipo de sala por andar e configuracao de ondas.
 * A geracao sempre respeita os obrigatorios: spawn, miniboss, 1+ tesouro,
 * <=1 loja, 1 descanso, 1 evento, chance de secreta.
 */
export const ROOM_RULES = {
  minTreasure: 1,
  maxShop: 1,
  rest: 1,
  event: 1,
  minCombat: 3,
  mainPathLen: [5, 6],     // comprimento do caminho principal (min, max)
  branches: [2, 4],        // ramificacoes laterais
};

/**
 * Pesos das salas EXTRAS (nao obrigatorias). As obrigatorias (spawn, miniboss,
 * 1 tesouro, 1 loja, 1 descanso, 1 evento, 1 secreta) sao colocadas pelo
 * gerador e nao entram no sorteio. O resto do predio e combate.
 */
export const ROOM_WEIGHTS = {
  1: { treasure: 3, combat: 10 },
  2: { treasure: 3, combat: 11 },
  3: { treasure: 2, combat: 11 },
  4: { treasure: 3, combat: 12 },
  5: { treasure: 3, combat: 13 },
  6: { treasure: 2, combat: 12 },
};

/** Ondas de inimigos por sala de combate: quantidade conforme andar. */
export function waveConfig(floor, roomRng) {
  const waves = roomRng.int(1, floor >= 4 ? 3 : 2);
  const perWave = 2 + Math.floor(floor / 2) + roomRng.int(0, 2);
  return { waves, perWave };
}

/** Custo dos itens da loja conforme andar. */
export function shopPrices(floor, rng) {
  return { weapon: 18 + floor * 4 + rng.int(-2, 3), blessing: 22 + floor * 5, heal: 12 + floor * 2 };
}
