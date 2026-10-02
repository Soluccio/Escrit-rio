/**
 * index.js — registro de todos os inimigos comuns.
 * A fabrica spawnEnemy(key) do Game usa este mapa para instanciar a classe
 * certa (com comportamentos especiais) a partir dos dados de data/enemies.js.
 */
import { Papel } from './Papel.js';
import { Grampeador } from './Grampeador.js';
import { Telefone } from './Telefone.js';
import { Planilha } from './Planilha.js';
import { Formulario } from './Formulario.js';
import { Burocrata } from './Burocrata.js';
import { Bug } from './Bug.js';
import { CafeDerramado } from './CafeDerramado.js';
import { CaboEmaranhado } from './CaboEmaranhado.js';
import { EstagiarioFantasma } from './EstagiarioFantasma.js';

export const ENEMY_CLASSES = {
  papel: Papel,
  grampeador: Grampeador,
  telefone: Telefone,
  planilha: Planilha,
  formulario: Formulario,
  burocrata: Burocrata,
  bug: Bug,
  bug_elite: Bug,          // mesmo sprite, arquetipo sniper (vem do data)
  cafe: CafeDerramado,
  cabo: CaboEmaranhado,
  fantasma: EstagiarioFantasma,
};

export {
  Papel, Grampeador, Telefone, Planilha, Formulario,
  Burocrata, Bug, CafeDerramado, CaboEmaranhado, EstagiarioFantasma,
};
