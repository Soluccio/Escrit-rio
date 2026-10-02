/**
 * constants.js — TODOS os valores de tuning do jogo ficam aqui.
 * Mexeu no balanceamento? Mexeu aqui. Nenhum numero magico espalhado pelo codigo.
 */

// ---------------------------------------------------------------- resolucao
export const VIEW_W = 480;   // largura do backbuffer (pixel art interno)
export const VIEW_H = 270;   // altura do backbuffer
export const TILE = 16;      // tamanho do tile em pixels de mundo

// Tamanho das salas em tiles (interior + borda de parede de 1 tile).
// Salas de combate 28x16 tiles = 448x256 px de mundo; com o viewport de 480x270
// a zoom 1.4 (343x193 px visiveis) o player ve ~77% da largura e ~75% da altura
// da sala: quase o mapa inteiro, com um scroll leve.
export const ROOM_COLS = 28, ROOM_ROWS = 16;
// Arenas de chefe 32x18 tiles = 512x288 px (margem extra para o combate).
export const BOSS_COLS = 32, BOSS_ROWS = 18;
export const GRID = 9;                            // grid 9x9 de salas por andar

// ---------------------------------------------------------------- tiles
export const T = {
  FLOOR: 0, FLOOR_ALT: 1, CARPET: 2, WALL: 3,
  SECRET: 4,        // parede destrutivel (sala secreta)
  DOOR: 5,          // porta aberta (passavel)
  DOOR_LOCKED: 6,   // porta trancada (solida enquanto a sala nao for limpa)
  EXIT: 7,          // elevador/saida
};
export const SOLID_TILES = new Set([T.WALL, T.SECRET, T.DOOR_LOCKED]);

// ---------------------------------------------------------------- gameplay
export const TUNING = {
  fixedDt: 1 / 60,          // delta fixo da simulacao (60 FPS)
  maxFrameDt: 0.1,          // clamp de dt para nao explodir em lag spikes
  hitstopHit: 0.04,         // 40ms de hit stop por acerto
  hitstopKill: 0.10,        // 100ms ao matar
  hitstopBoss: 0.22,        // freeze frame ao matar mini-boss
  flashTime: 0.10,          // flash branco do inimigo atingido
  shakeHit: 1.6, shakeKill: 3.0, shakeHurt: 4.5, shakeBoss: 6.0,
  comboTimer: 2.0,          // janela do combo counter
  comboMin: 3,              // 3 abates em 2s = "x3 COMBO!"
  comboCoinBonus: 2,        // moedas extras por abate em combo
  postureDecay: 6,          // postura perdida por segundo
  executeWindow: 2.0,       // tempo de janela de execucao
  secretChance: 0.5,        // chance de sala secreta por andar
};

export const PLAYER = {
  radius: 7, w: 12, h: 14,
  // Movimento: resposta "colada" no input. Referencia: speed 92 px/s, entao a
  // aceleracao e ~17x a velocidade (chega a 85% da maxima em ~0.05s) e a
  // friccao e 1.2x a aceleracao (para em ~0.05s ao soltar a tecla).
  speed: 92, accel: 1600, friction: 1900, turnBoost: 1.6,
  maxHp: 3, startCoins: 0,
  dashSpeed: 330, dashTime: 0.18, dashInvuln: 0.30, dashCooldown: 0.8,
  dashGhosts: 4,            // rastro de sprites fantasmas
  invulnAfterHurt: 1.0,
  clipDamage: 3, clipSpeed: 265, clipCooldown: 0.22, clipBurstCooldown: 0.15,
  clipSpread: 0.045,        // imprecisao leve ao segurar o gatilho
  pickupRange: 12,          // coleta automatica por proximidade
  interactRange: 22,        // tecla E
  critChance: 0.10, critMult: 2,
  coinHeartEvery: 100,      // +1 coracao a cada 100 moedas
  posturePerHit: 12,        // postura aplicada por acerto de clipe
};

// ---------------------------------------------------------------- inimigos
export const ENEMY = {
  hurtTime: 0.20,
  knockback: 60,
  separationForce: 26,      // empurrao suave entre inimigos
  pathRefresh: 0.35,        // recalculo do pathfinding (BFS em grid)
  losCheckEvery: 0.1,
  alertTime: 0.25,
  deathFreeze: 0.10,
  groupRadius: 220,         // 3+ inimigos perto => divisao de papeis
};

// ---------------------------------------------------------------- boss
export const BOSS = {
  zoom: 1.15,               // zoom de combate na arena de boss (ver CAMERA)
  phaseThresholds: [0.5],   // mini-bosses trocam de fase em 50%
  dialogueTime: 3.2,
  furyThreshold: 0.2,       // ataque especial de furia abaixo de 20%
  deathSlowmo: 3.0,
};

// ---------------------------------------------------------------- camera
/**
 * Zoom e suavizacao da camera. Salas de combate usam zoom 1.4 (tudo fica ~40%
 * maior na tela) e as arenas de chefe 1.15 (abre um pouco para o combate).
 */
export const CAMERA = {
  zoom: 1.4,                // salas normais
  zoomBoss: 1.15,           // arenas de mini-chefe e do CEO
  lerp: 0.15,               // suavizacao do follow
  deadzone: { w: 34, h: 22 },
  lookahead: 14,            // deslocamento na direcao da mira
};

// ---------------------------------------------------------------- tema por andar
/**
 * Cada andar tem: nome, kanji, paleta de piso/parede, pool de inimigos e boss.
 * kanji de transicao: 竹 商 書 会 技 終
 */
export const FLOORS = [
  {
    n: 1, name: 'Recepcao', kanji: '竹', boss: 'recepcionista',
    carpet: '#2b2b3d', floor: '#3a3a4a', wall: '#5a5a6b', accent: '#ff8fa3',
    music: 'lobby', ambient: 'fax',
    pool: ['papel', 'grampeador', 'bug'],
  },
  {
    n: 2, name: 'Vendas', kanji: '商', boss: 'vendedor',
    carpet: '#3d3227', floor: '#463a2c', wall: '#6b5a45', accent: '#ff9800',
    music: 'sales', ambient: 'phone',
    pool: ['telefone', 'planilha', 'bug', 'papel'],
  },
  {
    n: 3, name: 'RH', kanji: '書', boss: 'entrevistadora',
    carpet: '#33304a', floor: '#3c3956', wall: '#5f5a80', accent: '#b39ddb',
    music: 'hr', ambient: 'keyboard',
    pool: ['formulario', 'burocrata', 'papel', 'telefone'],
  },
  {
    n: 4, name: 'Reunioes', kanji: '会', boss: 'gerente',
    carpet: '#2f3a35', floor: '#37443e', wall: '#54685e', accent: '#90a4ae',
    music: 'meeting', ambient: 'chairs',
    pool: ['cafe', 'cabo', 'telefone', 'bug'],
  },
  {
    n: 5, name: 'TI', kanji: '技', boss: 'estagiarioTI',
    carpet: '#26313a', floor: '#2c3d47', wall: '#43606b', accent: '#00e676',
    music: 'it', ambient: 'beeps',
    pool: ['bug_elite', 'cabo', 'fantasma', 'bug'],
  },
  {
    n: 6, name: 'Diretoria', kanji: '終', boss: 'ceo',
    carpet: '#3a2f1e', floor: '#463a24', wall: '#7a6430', accent: '#ffcf4d',
    music: 'ceo', ambient: 'choir',
    pool: ['bug_elite', 'burocrata', 'fantasma', 'cabo', 'telefone'],
  },
];

// Escala de dificuldade progressiva por andar.
export function floorScale(n) {
  return {
    hp: 1 + 0.28 * (n - 1),
    damage: 1 + Math.floor((n - 1) / 3),   // +1 de dano a cada 3 andares (teto: base+1)
    speed: 1 + 0.06 * (n - 1),
    coins: 1 + 0.15 * (n - 1),
  };
}

// ---------------------------------------------------------------- estados
export const S = {
  MENU: 'MENU', PLAY: 'PLAY', PAUSE: 'PAUSE', TRANSITION: 'TRANSITION',
  GAMEOVER: 'GAMEOVER', WIN: 'WIN', BLESSING: 'BLESSING', SHOP: 'SHOP',
  CHAR: 'CHAR', GALLERY: 'GALLERY', CHOICE: 'CHOICE',
};

export const RARITY = { common: 0.6, rare: 0.3, legendary: 0.1 };
export const RARITY_COLOR = { common: '#e8e8f0', rare: '#7fe3d4', legendary: '#ffcf4d' };

// Salas e icones do minimapa.
export const ROOM_ICON = {
  spawn: 'S', combat: 'C', treasure: 'T', shop: '$', rest: 'R',
  event: '?', secret: '*', miniboss: 'M', boss: 'B',
};
