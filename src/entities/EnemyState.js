/**
 * EnemyState.js — os estados da maquina de estados finita dos inimigos.
 * Fica em arquivo proprio para a IA (EnemyAI.js) e a base (Enemy.js) poderem
 * usar sem importacao circular.
 */
export const STATE = {
  IDLE: 'IDLE',
  PATROL: 'PATROL',
  ALERT: 'ALERT',
  CHASE: 'CHASE',
  TELEGRAPH: 'TELEGRAPH',
  ATTACK: 'ATTACK',
  RETREAT: 'RETREAT',
  HURT: 'HURT',
  DEAD: 'DEAD',
  WANDER: 'WANDER',
  SUPPORT: 'SUPPORT',
  SNIPE: 'SNIPE',
};
