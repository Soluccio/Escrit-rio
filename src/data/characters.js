/**
 * characters.js — estagiarios desbloqueaveis com Selos de Estagio (meta-progressao).
 * cost 0 = desbloqueado desde o inicio.
 */
export const CHARACTERS = [
  { id: 'max', name: 'Max', cost: 0, desc: 'O estagiario classico. Equilibrado.',
    hp: 0, speed: 1, damage: 1, special: null },
  { id: 'bia', name: 'Bia', cost: 20, desc: 'Mais rapida, menos vida (2 coracoes).',
    hp: -1, speed: 1.25, damage: 1, special: null },
  { id: 'tonho', name: 'Tonho', cost: 35, desc: 'Ataque pesado, movimento lento.',
    hp: 1, speed: 0.82, damage: 1.5, special: null },
  { id: 'kiko', name: 'Kiko', cost: 50, desc: 'Cura 1/2 coracao a cada 10 abates.',
    hp: 0, speed: 1, damage: 1, special: 'healOnKill' },
  { id: 'duda', name: 'Duda', cost: 65, desc: 'Ctrl+Z: desfaz 1 dano a cada 60s.',
    hp: 0, speed: 1, damage: 1, special: 'undoDamage' },
  { id: 'ze', name: 'Seu Ze', cost: 80, desc: '3 coracoes extras e comeca com a Regua.',
    hp: 3, speed: 0.9, damage: 1, special: null },
];

export const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map(c => [c.id, c]));

/** Selos ganhos numa run: moedas/2 + andares*5 + boss*10. */
export function sealsFromRun(run) {
  return Math.floor((run.coinsEarned || 0) / 2) + (run.floor - 1) * 5 + run.minibossesKilled * 10;
}
