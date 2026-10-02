/**
 * Palette.js — cores nomeadas do jogo + tema por andar.
 * Tudo pixel art: cada cor e usada crua, sem gradiente nem alpha suave.
 */
export const PAL = {
  // fundo
  bgDark: '#1a1a2e', bgMid: '#16213e', black: '#0b0b14', white: '#f4f4fa',

  // player (Max)
  skin: '#e8b78a', skinShade: '#c99366', shirt: '#3f51b5', shirtShade: '#2c3a86',
  tie: '#c62828', eyes: '#ffd93d', hair: '#3b2a20', shoe: '#2b2b33',

  // papel
  paper: '#e8e8f0', paperShade: '#c3c3d4', paperLine: '#7a7a8c',

  // metal / grampeador
  steel: '#b0bec5', steelShade: '#7c8a92', wood: '#5d4037',

  // telefone
  phoneBody: '#37474f', phoneShade: '#202c33', screen: '#81c784',

  // bug
  bug: '#7fe3d4', bugDark: '#3f9c8f',

  // cafe
  coffee: '#5d4037', coffeeSteam: '#e8e8f0', coffeeLight: '#8d6e63',

  // bosses
  recep: '#ff8fa3', vendedor: '#ff9800', entrevistadora: '#b39ddb',
  gerente: '#90a4ae', ti: '#00e676', ceo: '#ffcf4d',

  // cenário
  floor: '#3a3a4a', floorAlt: '#33333f', carpet: '#2b2b3d',
  wall: '#5a5a6b', wallTop: '#4a4a5a', wallShade: '#3f3f4d',
  door: '#8d6e63', doorLocked: '#6d4c41', exit: '#4dd0e1',
  plant: '#4caf50', plantDark: '#2e7d32', pot: '#8d6e63',
  printer: '#e0e0e0', printerDark: '#9e9e9e', trash: '#607d8b',
  frame: '#ffd54f', framePic: '#42a5f5',

  // itens / fx
  coinGold: '#ffd54f', coinDark: '#c9a227', heart: '#ef5350', heartDark: '#b71c1c',
  toner: '#7e57c2', keyGold: '#ffe082', chest: '#8d6e63', chestMetal: '#ffd54f',
  damage: '#ffffff', damageCrit: '#ffd93d', damageExec: '#ff5252',
  particleInk: '#3f51b5',

  uiText: '#e8e8f0', uiDim: '#8f8fa3', uiAccent: '#ffcf4d', uiBg: '#12121f',
  hp: '#ef5350', stamina: '#7fe3d4', combo: '#ffcf4d',
};

/** Tema de cores por andar (pisos/paredes vem de FLOORS, aqui extras). */
export const FLOOR_TINT = {
  1: { carpet1: '#2b2b3d', carpet2: '#262636', wallAccent: '#ff8fa3' },
  2: { carpet1: '#3d3227', carpet2: '#352b21', wallAccent: '#ff9800' },
  3: { carpet1: '#33304a', carpet2: '#2c2941', wallAccent: '#b39ddb' },
  4: { carpet1: '#2f3a35', carpet2: '#28322e', wallAccent: '#90a4ae' },
  5: { carpet1: '#26313a', carpet2: '#202a32', wallAccent: '#00e676' },
  6: { carpet1: '#3a2f1e', carpet2: '#322819', wallAccent: '#ffcf4d' },
};

/** Cores de cada chefe (usadas nos sprites). */
export const BOSS_COLORS = {
  recepcionista: PAL.recep, vendedor: PAL.vendedor, entrevistadora: PAL.entrevistadora,
  gerente: PAL.gerente, estagiarioTI: PAL.ti, ceo: PAL.ceo,
};

/** Cor do minimapa por tipo de sala. */
export const MINIMAP_COLORS = {
  spawn: '#7fe3d4', combat: '#8f8fa3', treasure: '#ffd54f', shop: '#81c784',
  rest: '#ff8fa3', event: '#b39ddb', secret: '#ff5252', miniboss: '#ff9800', boss: '#ffcf4d',
};

/** Helpers de manipulacao de cor hex. */
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r + amt)));
  g = Math.max(0, Math.min(255, Math.round(g + amt)));
  b = Math.max(0, Math.min(255, Math.round(b + amt)));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
export const darker = (hex, amt = 30) => shade(hex, -amt);
export const lighter = (hex, amt = 30) => shade(hex, amt);
