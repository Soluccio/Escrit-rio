/**
 * Rewards.js — recompensas e interacoes do predio: escolha de bencao, premio de
 * chefe, bau de tesouro, evento da sala de espera, sala secreta e loja.
 *
 * Cada funcao recebe o Director (`d`) e usa `d.game`. Ficou separado do
 * Director.js para manter o arquivo abaixo de 400 linhas.
 */
import { S } from '../data/constants.js';
import { BOSSES } from '../data/bosses.js';
import { ITEMS } from '../data/items.js';
import { rollBlessings } from '../data/blessings.js';

/** Abre o escolhedor de 3 bencaos e aplica a escolhida. */
export function offerBlessing(d, reason, pool = null) {
  const g = d.game;
  const owned = g.player.stats.blessings.map(b => b.id);
  g.blessingPicker.open(g.rng, owned, reason, (chosen) => {
    if (chosen) g.player.addBlessing(chosen);
    g.state = S.PLAY;
  }, pool);
  if (g.blessingPicker.active) g.state = S.BLESSING;
}

/** Premio de mini-chefe/boss: chave, itens, moedas, cafe e bencao. */
export function giveBossReward(d, boss) {
  const g = d.game;
  const id = boss.bossId;
  const def = BOSSES[id];
  g.save.markBossKill(id);
  g.stats.minibossesKilled++;
  const reward = def?.reward || {};
  const p = g.player;

  // chave do elevador (o mini-chefe sempre guarda uma)
  if (reward.key) {
    g.stats.hasKey = true;
    g.spawnPickup('key', boss.x, boss.y, {});
    g.fx.banner('CHAVE DO ELEVADOR!', '#ffcf4d', 2.4, 44);
  }
  if (reward.badge) g.spawnPickup('badge', boss.x, boss.y, {});
  if (reward.coffees) {
    for (let i = 0; i < Math.min(8, reward.coffees); i++) {
      g.spawnPickup('coffee', boss.x + g.rng.range(-20, 20), boss.y + g.rng.range(-20, 20), { life: Infinity });
    }
  }
  if (reward.signedForm) g.spawnPickup('form', boss.x, boss.y, {});
  if (reward.legendary) g.spawnPickup('drive', boss.x, boss.y, {});
  if (reward.item) {
    p.items = p.items || [p.activeItem];
    if (p.items.length < p.stats.activeSlots) p.items.push(reward.item);
    else p.items[p.items.length - 1] = reward.item;
    p.activeItem = reward.item;
    g.fx.banner(ITEMS[reward.item].name.toUpperCase() + ' EQUIPADO', '#7fe3d4', 2, 44);
  }
  if (reward.coins) {
    for (let i = 0; i < Math.min(10, Math.round(reward.coins / 8)); i++) {
      g.spawnPickup('coin', boss.x + g.rng.range(-24, 24), boss.y + g.rng.range(-24, 24), { amount: 8, life: Infinity });
    }
  }
  // bencao garantida
  if (reward.blessings) offerBlessing(d, 'RECOMPENSA DO CHEFE');
  if (reward.rareBlessing) {
    const owned = p.stats.blessings.map(b => b.id);
    const rarePool = rollBlessings(g.rng, 1, owned, null);
    offerBlessing(d, 'BENCAO RARA', rarePool);
  }
  g.fx.freezeFrame(0.5);
  g.camera.addShake(7);
  g.audio.sfx('bossHorn');
}

/** Bau de tesouro: item ativo novo ou bencao, mais moedas. */
export function onChestOpened(d, inter) {
  const g = d.game;
  g.audio.sfx('secret');
  g.fx.burst(inter.x, inter.y, 'gold', { count: 16, speedMult: 1.3 });
  if (g.rng.chance(0.5)) {
    const id = g.rng.pick(Object.keys(ITEMS));
    const p = g.player;
    p.items = p.items || [p.activeItem];
    if (p.items.length < p.stats.activeSlots) p.items.push(id);
    else p.items[p.items.length - 1] = id;
    p.activeItem = id;
    g.fx.banner(ITEMS[id].name.toUpperCase() + '!', '#7fe3d4', 2.2, 44);
  } else {
    offerBlessing(d, 'TESOURO');
  }
  g.dropLoot({ x: inter.x, y: inter.y, def: { coins: 3 } }, 0);
}

/** Sala de espera: um eventinho com consequencia (boa ou ruim). */
export function onEventTriggered(d, inter) {
  const g = d.game;
  const events = [
    {
      text: 'Colega fofoqueiro: "Cara, pega esse cafe... vai por mim."',
      apply: () => { g.spawnPickup('coffee', inter.x, inter.y, {}); g.player.heal(1); },
    },
    {
      text: 'Cafe da copa esta gratis. Voce enche a caneca.',
      apply: () => { g.player.heal(1); },
    },
    {
      text: 'Achou um cracha no chao. Ninguem sentiu falta.',
      apply: () => { g.stats.coins += 15; g.stats.coinsEarned += 15; g.fx.banner('+15 MOEDAS', '#ffd54f', 1.6, 44); },
    },
    {
      text: 'A impressora imprimiu 40 paginas sozinha. Ninguem sabe de nada.',
      apply: () => { offerBlessing(d, 'EVENTO: IMPRESSORA AMALDICOADA'); },
    },
    {
      text: 'O RH deixou um formulario em branco. Assine e veja no que da.',
      apply: () => { g.player.hp = Math.max(1, g.player.hp - 1); g.spawnPickup('heart', inter.x, inter.y + 16, {}); },
    },
  ];
  const ev = g.rng.pick(events);
  g.fx.banner('EVENTO', '#b39ddb', 1.4, 44);
  g.dialogue.show('SALA DE ESPERA', ev.text, 3.4);
  ev.apply();
}

/** Arquivo morto: 40 moedas, coracao, cafe e uma bencao extra. */
export function onSecretFound(d, inter) {
  const g = d.game;
  g.fx.burst(inter.x, inter.y, 'gold', { count: 24, speedMult: 1.5 });
  g.audio.sfx('secret');
  g.stats.coins += 40;
  g.stats.coinsEarned += 40;
  g.fx.banner('ARQUIVO MORTO: +40 MOEDAS', '#ffd54f', 2.2, 44);
  g.spawnPickup('heart', inter.x - 18, inter.y, {});
  g.spawnPickup('coffee', inter.x + 18, inter.y, {});
  offerBlessing(d, 'RECOMPENSA SECRETA');
}

/** Cantina: abre a loja com tres itens. */
export function openShop(d, inter) {
  const g = d.game;
  g.shop.open(g, inter);
  g.state = S.SHOP;
}

/** Precos da loja do andar atual. */
export function shopPrices(d) {
  const g = d.game;
  return {
    weapon: 18 + g.floorN * 4 + g.rng.int(-2, 3),
    blessing: 22 + g.floorN * 5,
    heal: 10 + g.floorN * 2,
  };
}
