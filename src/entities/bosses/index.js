/**
 * index.js — registro dos chefes (5 mini-bosses + CEO).
 */
import { Recepcionista } from './Recepcionista.js';
import { VendedorDoMes } from './VendedorDoMes.js';
import { Entrevistadora } from './Entrevistadora.js';
import { GerenteProjetos } from './GerenteProjetos.js';
import { EstagiarioTI } from './EstagiarioTI.js';
import { CEO } from './CEO.js';

export const BOSS_CLASSES = {
  recepcionista: Recepcionista,
  vendedor: VendedorDoMes,
  entrevistadora: Entrevistadora,
  gerente: GerenteProjetos,
  estagiarioTI: EstagiarioTI,
  ceo: CEO,
};

/** Ordem dos mini-bosses por andar (1..5) + CEO no 6. */
export const BOSS_BY_FLOOR = {
  1: 'recepcionista', 2: 'vendedor', 3: 'entrevistadora',
  4: 'gerente', 5: 'estagiarioTI', 6: 'ceo',
};

export { Recepcionista, VendedorDoMes, Entrevistadora, GerenteProjetos, EstagiarioTI, CEO };
