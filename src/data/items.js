/**
 * items.js — itens ativos (ataque secundario). Cada um tem cooldown e efeito unico.
 * use(player, game) dispara o efeito. O player comeca com o grampeador.
 */
export const ITEMS = {
  grampeador: {
    name: 'Grampeador', cooldown: 0.9, kind: 'shotgun', desc: 'Leque de grampos, dano alto a curta distancia.',
    props: { dmg: 4, count: 5, spread: 0.55, speed: 230, range: 90, projectile: 'staple' },
  },
  marcatexto: {
    name: 'Marca-texto', cooldown: 0.6, kind: 'beam', desc: 'Feixe de tinta que atravessa inimigos.',
    props: { dmg: 2, length: 150, width: 6, projectile: 'ink' },
  },
  regua: {
    name: 'Regua de 30cm', cooldown: 0.5, kind: 'melee', desc: 'Golpe corpo a corpo com knockback forte.',
    props: { dmg: 6, length: 34, arc: 1.2, knockback: 220 },
  },
  hdmi: {
    name: 'Cabo HDMI', cooldown: 1.4, kind: 'chain', desc: 'Chicote eletrico que atinge varios inimigos em cadeia.',
    props: { dmg: 3, jumps: 3, range: 70, stun: 0.6 },
  },
  xicara: {
    name: 'Xicara Quente', cooldown: 1.2, kind: 'pool', desc: 'Arremessa cafe fervente que deixa poça de dano.',
    props: { dmg: 3, poolDmg: 1, poolTime: 3, radius: 26, projectile: 'coffee' },
  },
  projetor: {
    name: 'Controle do Projetor', cooldown: 2.0, kind: 'slide', desc: 'Projeta um slide que vara a tela causando dano em linha.',
    props: { dmg: 8, count: 3, speed: 200, projectile: 'slide', pierce: 99 },
  },
  cafe_expresso_item: {
    name: 'Maquina de Cafe Portatil', cooldown: 6.0, kind: 'heal', desc: 'Bebe um cafe: cura 1 coracao.',
    props: { heal: 1 },
  },
  tonico: {
    name: 'Tonico de Toner', cooldown: 8.0, kind: 'buff', desc: 'Fúria: +50% dano por 5s.',
    props: { buff: 5 },
  },
};

export const ITEM_IDS = Object.keys(ITEMS);

/** Item ativo inicial por personagem (Seu Ze tem item fixo). */
export function startingItem(characterId) {
  if (characterId === 'ze') return 'regua';
  if (characterId === 'tonho') return 'grampeador';
  return 'grampeador';
}
