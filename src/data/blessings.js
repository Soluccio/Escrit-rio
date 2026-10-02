/**
 * blessings.js — upgrades passivos (bencaos).
 * apply(stats) muta o objeto de stats do player. Efeitos unicos usam flags.
 * Raridade: comum 60%, rara 30%, lendaria 10%.
 */
export const BLESSINGS = [
  // ------------------------------------------------------------ comuns
  { id: 'caneca', name: 'Caneca Termica', rarity: 'common', icon: 'coffee', desc: 'Cafe cura 2 em vez de 1.',
    apply: s => { s.coffeeHeal += 1; } },
  { id: 'postit', name: 'Post-it', rarity: 'common', icon: 'note', desc: 'Revela salas adjacentes no minimapa.',
    apply: s => { s.revealAdjacent = true; } },
  { id: 'oculos', name: 'Oculos Escuros', rarity: 'common', icon: 'glasses', desc: '+15% de dano.',
    apply: s => { s.damage *= 1.15; } },
  { id: 'cafe_expresso', name: 'Cafe Expresso', rarity: 'common', icon: 'coffee', desc: '+20% de velocidade.',
    apply: s => { s.speed *= 1.2; } },
  { id: 'cracha_dourado', name: 'Crachá Dourado', rarity: 'common', icon: 'badge', desc: '+1 coracao maximo.',
    apply: s => { s.maxHp += 1; } },
  { id: 'marcatexto', name: 'Marca-texto', rarity: 'common', icon: 'marker', desc: 'Ataques deixam rastro de tinta que causa dano.',
    apply: s => { s.trailDamage = 2; } },
  { id: 'clips', name: 'Caixa de Clipes', rarity: 'common', icon: 'clip', desc: '+20% de cadencia.',
    apply: s => { s.fireRate *= 0.82; } },
  { id: 'pilha', name: 'Pilha Alcalina', rarity: 'common', icon: 'battery', desc: 'Recarga do dash 25% mais rapida.',
    apply: s => { s.dashCooldown *= 0.75; } },
  { id: 'fone', name: 'Fone de Ouvido', rarity: 'common', icon: 'headset', desc: 'Imunidade a ataques sonoros.',
    apply: s => { s.soundImmune = true; } },
  { id: 'estojo', name: 'Estojo', rarity: 'common', icon: 'pencil', desc: '+1 de dano nos clipes.',
    apply: s => { s.clipDamage += 1; } },

  // ------------------------------------------------------------ raras
  { id: 'grampo', name: 'Grampo de Cabelo', rarity: 'rare', icon: 'pin', desc: '+1 carga de dash.',
    apply: s => { s.dashCharges += 1; } },
  { id: 'agenda', name: 'Agenda Lotada', rarity: 'rare', icon: 'note', desc: '+1 slot de item ativo.',
    apply: s => { s.activeSlots += 1; } },
  { id: 'cracha_vendas', name: 'Crachá de Vendas', rarity: 'rare', icon: 'badge', desc: '+25% de dano contra elites.',
    apply: s => { s.eliteDamage *= 1.25; } },
  { id: 'hidratante', name: 'Hidratante', rarity: 'rare', icon: 'lotion', desc: 'Invencibilidade apos dano +0.5s.',
    apply: s => { s.hurtInvuln += 0.5; } },
  { id: 'planner', name: 'Planner 2026', rarity: 'rare', icon: 'note', desc: '+1 coracao e cura total ao pegar.',
    apply: s => { s.maxHp += 1; s.healOnPickup += s.maxHp; } },
  { id: 'mouse', name: 'Mouse Gamer', rarity: 'rare', icon: 'mouse', desc: 'Projeteis ficam 30% mais rapidos.',
    apply: s => { s.projSpeed *= 1.3; } },
  { id: 'cafeteira', name: 'Cafeteira Pessoal', rarity: 'rare', icon: 'coffee', desc: 'Dropa cafe a cada 8 abates.',
    apply: s => { s.coffeeEveryKill = 8; } },
  { id: 'cadeira', name: 'Cadeira Ergonômica', rarity: 'rare', icon: 'chair', desc: '+2 de vida maxima no inicio de cada andar.',
    apply: s => { s.floorHpBonus = 2; } },

  // ------------------------------------------------------------ lendarias
  { id: 'pendrive', name: 'Pen Drive Dourado', rarity: 'legendary', icon: 'drive', desc: 'Dobra a cadencia e os clipes perfuram inimigos.',
    apply: s => { s.fireRate *= 0.5; s.pierce += 1; } },
  { id: 'contrato', name: 'Contrato Efetivo', rarity: 'legendary', icon: 'contract', desc: 'Revive uma vez por run com 1 coracao.',
    apply: s => { s.revives += 1; } },
  { id: 'multitarefa', name: 'Multitarefa', rarity: 'legendary', icon: 'laptop', desc: 'Atira em leque triplo.',
    apply: s => { s.shots += 2; s.clipDamage *= 0.8; } },
  { id: 'google', name: 'Aumento Negado', rarity: 'legendary', icon: 'money', desc: 'Cada acerto tem 15% de chance de critico x3.',
    apply: s => { s.critChance += 0.15; s.critMult += 1; } },
];

export const BLESSING_BY_ID = Object.fromEntries(BLESSINGS.map(b => [b.id, b]));

/** Sorteia n bencaos respeitando raridade e evitando repetidas ja possuidas. */
export function rollBlessings(rng, n, ownedIds = [], pool = null) {
  const source = pool || BLESSINGS;
  const avail = source.filter(b => !ownedIds.includes(b.id));
  const out = [];
  for (let i = 0; i < n && avail.length; i++) {
    const r = rng.next();
    const wanted = r < 0.6 ? 'common' : r < 0.9 ? 'rare' : 'legendary';
    let bucket = avail.filter(b => b.rarity === wanted);
    if (!bucket.length) bucket = avail;
    const pick = bucket[rng.int(0, bucket.length - 1)];
    out.push(pick);
    avail.splice(avail.indexOf(pick), 1);
  }
  return out;
}
