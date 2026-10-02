/**
 * bosses.js — 5 mini-bosses + CEO. Cada um tem falas, fases, ataques e recompensa.
 * Os padroes de ataque sao executados pelos scripts em src/entities/bosses/*.js,
 * este arquivo guarda os DADOS (numeros, textos e listas de ataques).
 */

export const BOSSES = {
  recepcionista: {
    id: 'recepcionista', name: 'A RECEPCIONISTA', sprite: 'recepcionista', size: 40,
    floor: 1, hp: 120, speed: 26, dmg: 1, contact: 1,
    intro: 'Bem-vindo(a)! Voce tem hora marcada? Nao? Entao tome caneta na cara.',
    mini: true, zoom: true, color: '#ff8fa3', music: 'boss_recep',
    phases: [1, 2], phaseText: ['O cracha esta errado.', 'Vou chamar a seguranca... quer dizer, a cadeira.'],
    reward: { key: true, blessings: 1, coins: 25 },
    attacks: ['penFan', 'agendaThrow', 'summonVisitors', 'chairSpin'],
  },
  vendedor: {
    id: 'vendedor', name: 'O VENDEDOR DO MES', sprite: 'vendedor', size: 42,
    floor: 2, hp: 165, speed: 30, dmg: 1, contact: 1,
    intro: 'BATEU A META! E agora vou bater VOCE. Sinergia total!',
    mini: true, zoom: true, color: '#ff9800', music: 'boss_vendas',
    phases: [1, 2], phaseText: ['Meta batida!', 'Vamos escalar esse resultado!'],
    reward: { badge: true, coffees: 20, coins: 40 },
    attacks: ['curseSheet', 'huntingPhone', 'giantSlam', 'shockwave'],
  },
  entrevistadora: {
    id: 'entrevistadora', name: 'A ENTREVISTADORA', sprite: 'entrevistadora', size: 40,
    floor: 3, hp: 210, speed: 28, dmg: 1, contact: 1,
    intro: 'Fale sobre um desafio. E sobre outro. E sobre todos eles.',
    mini: true, zoom: true, color: '#b39ddb', music: 'boss_rh',
    phases: [1, 2], phaseText: ['Proxima pergunta.', 'Ultima pergunta. Mentira, tem 47.'],
    reward: { signedForm: true, rareBlessing: 1, coins: 40 },
    attacks: ['questionZone', 'paperShield', 'summonForms', 'mirrorQuestion'],
  },
  gerente: {
    id: 'gerente', name: 'O GERENTE DE PROJETOS', sprite: 'gerente', size: 44,
    floor: 4, hp: 265, speed: 30, dmg: 2, contact: 1,
    intro: 'Pessoal, rapido alinhamento de 5 minutos sobre o seu falecimento.',
    mini: true, zoom: true, color: '#90a4ae', music: 'boss_reuniao',
    phases: [1, 2], phaseText: ['Vou puxar um slide.', 'So mais um alinhamento.'],
    reward: { item: 'projetor', coins: 55 },
    attacks: ['slideBeam', 'spinChair', 'drips', 'projectorCore'],
  },
  estagiarioTI: {
    id: 'estagiarioTI', name: 'O ESTAGIARIO DE TI', sprite: 'estagiarioTI', size: 40,
    floor: 5, hp: 330, speed: 34, dmg: 2, contact: 1,
    intro: 'Ja tentou desligar e ligar de novo? Pois e. Nao funciona com a gente.',
    mini: true, zoom: true, color: '#00e676', music: 'boss_ti',
    phases: [1, 2, 3], phaseText: ['Reboot em 3... 2...', 'Voce e eu? Eu sou voce?', 'Isso aconteceu antes.'],
    reward: { legendary: 'pendrive', ability: true, coins: 70 },
    attacks: ['cableWhip', 'bugSwarm', 'roomReboot', 'virusGiant', 'mirrorMax'],
  },
  ceo: {
    id: 'ceo', name: 'O CEO', sprite: 'ceo', size: 64,
    floor: 6, hp: 620, speed: 30, dmg: 2, contact: 2,
    intro: 'Max. Eu fui voce. Voce sera eu. Assine aqui, na linha pontilhada da sua alma.',
    mini: false, zoom: true, color: '#ffcf4d', music: 'boss_ceo',
    phases: [1, 2, 3],
    phaseText: [
      'O conselho pediu demissao. De voce.',
      'Eu ja fiz tudo isso. Funcionou? Vamos ver.',
      'Voce chegou no topo. O topo sempre volta ao primeiro andar.',
    ],
    reward: { win: true },
    attacks: ['corporateSpread', 'charge', 'cloneExecs', 'mirrorBlessings', 'executiveShield', 'finalAudit'],
  },
};

/** Ataque de furia (< 20% de vida) — nome para o HUD. */
export const FURY = {
  recepcionista: 'FILA INDIGNADA',
  vendedor: 'META INFINITA',
  entrevistadora: 'PERGUNTA FINAL',
  gerente: 'SCOPE CREEP',
  estagiarioTI: 'KERNEL PANIC',
  ceo: 'DEMISSAO EM MASSA',
};

/** Falas de morte de cada chefe. */
export const DEATH_LINES = {
  recepcionista: 'Sua sala e a 1. O cafe esta no 3.',
  vendedor: 'Time! Time! A meta era outra!',
  entrevistadora: 'Encerramos por aqui. Vamos manter seu curriculo.',
  gerente: 'Vou levar isso pro proximo comite.',
  estagiarioTI: 'Revertendo... revertendo... ah, nao.',
  ceo: 'Bom trabalho, Max. A cadeira esta esperando.',
};
