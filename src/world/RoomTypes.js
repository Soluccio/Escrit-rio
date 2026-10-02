/**
 * RoomTypes.js — comportamento de cada tipo de sala.
 * Cada tipo define: piso, props caracteristicos, se tranca as portas,
 * se spawna inimigos e o que a sala oferece quando limpa.
 */
import { TILE } from '../data/constants.js';
import { Prop, decorateRoom } from './Prop.js';

export const ROOM_TYPES = {
  spawn: {
    name: 'Entrada', floor: 'floor', locks: false, enemies: 0, icon: 'S',
    desc: 'Sem inimigos. A porta atras tranca: nao tem volta.',
    props: (map, rng, floor) => {
      const p = decorateRoom(map, rng, floor, 'spawn');
      p.push(new Prop('whiteboard', TILE * 4 + 8, TILE * 3 + 7));   // aviso de seguranca
      p.push(new Prop('plant', map.w - TILE * 4, TILE * 3 + 8));
      return p;
    },
  },
  combat: {
    name: 'Escritorio', floor: 'floor', locks: true, enemies: 1, icon: 'C',
    desc: '1-3 ondas de inimigos. Portas abrem ao limpar.',
    props: (map, rng, floor) => decorateRoom(map, rng, floor, 'combat'),
  },
  treasure: {
    name: 'Tesouraria', floor: 'carpet', locks: false, enemies: 0, icon: 'T',
    desc: 'Bau com item garantido.',
    props: (map, rng, floor) => decorateRoom(map, rng, floor, 'treasure'),
  },
  shop: {
    name: 'Cantina', floor: 'carpet', locks: false, enemies: 0, icon: '$',
    desc: 'Tres itens a venda por moedas.',
    props: (map, rng, floor) => {
      const p = decorateRoom(map, rng, floor, 'shop');
      p.push(new Prop('vending', TILE * 5 + 8, TILE * 5 + 11));
      p.push(new Prop('vending', map.w - TILE * 5, TILE * 5 + 11));
      return p;
    },
  },
  rest: {
    name: 'Copa', floor: 'carpet', locks: false, enemies: 0, icon: 'R',
    desc: 'Maquina de cafe: cura completa uma vez por andar.',
    props: (map, rng, floor) => {
      const p = decorateRoom(map, rng, floor, 'rest');
      // fora do corredor central das portas (a sala continua atravessavel)
      p.push(new Prop('coffeemaker', map.w / 2 - 96, TILE * 3 + 12));
      p.push(new Prop('watercooler', map.w / 2 + 96, TILE * 3 + 10));
      return p;
    },
  },
  event: {
    name: 'Sala de Espera', floor: 'carpet', locks: false, enemies: 0, icon: '?',
    desc: 'Escolha com consequencia.',
    props: (map, rng, floor) => decorateRoom(map, rng, floor, 'event'),
  },
  secret: {
    name: 'Arquivo Morto', floor: 'carpet', locks: false, enemies: 0, icon: '*',
    desc: 'Atras de parede destrutivel. Recompensa grande.',
    props: (map, rng, floor) => decorateRoom(map, rng, floor, 'secret'),
  },
  miniboss: {
    name: 'Arena do Chefe', floor: 'carpet', locks: true, enemies: 0, icon: 'M',
    desc: 'Arena grande, musica propria, porta trancada na luta.',
    boss: true,
    props: (map, rng, floor) => {
      const p = [];
      // arena limpa com props destrutiveis nos cantos
      const spots = [[4, 4], [map.cols - 5, 4], [4, map.rows - 5], [map.cols - 5, map.rows - 5]];
      for (const [cx, cy] of spots) {
        const kinds = ['desk', 'chair', 'plant', 'server', 'speaker'];
        p.push(new Prop(rng.pick(kinds), cx * TILE + 8, cy * TILE + 8, { hpScale: 1.6 }));
      }
      return p;
    },
  },
  boss: {
    name: 'Diretoria', floor: 'carpet', locks: true, enemies: 0, icon: 'B', boss: true,
    desc: 'A arena final. Porta selada ate derrotar o CEO.',
    props: (map, rng, floor) => {
      const p = [];
      // projetor fora do eixo das portas (o CEO orbita a mesa no centro)
      p.push(new Prop('projector', map.w / 2 - 64, TILE * 3));
      p.push(new Prop('speaker', TILE * 4, TILE * 4 + 8));
      p.push(new Prop('speaker', map.w - TILE * 4, TILE * 4 + 8));
      p.push(new Prop('plant', TILE * 4, map.h - TILE * 4));
      p.push(new Prop('plant', map.w - TILE * 4, map.h - TILE * 4));
      p.push(new Prop('chair', map.w / 2 - 60, map.h / 2 + 40, { spin: true, spinSpeed: 1.8, anchor: { x: map.w / 2 - 60, y: map.h / 2 + 40 }, orbit: 40 }));
      p.push(new Prop('chair', map.w / 2 + 60, map.h / 2 + 40, { spin: true, spinSpeed: 2.4, anchor: { x: map.w / 2 + 60, y: map.h / 2 + 40 }, orbit: 40 }));
      return p;
    },
  },
};

export function roomTypeDef(kind) { return ROOM_TYPES[kind] || ROOM_TYPES.combat; }
