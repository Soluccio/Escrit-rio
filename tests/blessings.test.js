/**
 * blessings.test.js — cada bencao aplica o efeito correto no player e a
 * raridade respeita as probabilidades configuradas.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLESSINGS, rollBlessings, BLESSING_BY_ID } from '../src/data/blessings.js';
import { createHeadlessGame, startRun } from '../tools/headless.mjs';
import { RNG } from '../src/core/RNG.js';
import { ITEMS } from '../src/data/items.js';
import { CHARACTERS } from '../src/data/characters.js';

function freshPlayer(character = 'max') {
  const { game } = createHeadlessGame({ seed: 4321 });
  startRun(game, 4321, character);
  return { game, p: game.player };
}

test('bencaos de dano e velocidade mudam os stats', () => {
  const { p } = freshPlayer();
  const dmg0 = p.stats.damage;
  p.addBlessing(BLESSING_BY_ID.oculos);
  assert.ok(p.stats.damage > dmg0, '+15% dano aplicado');

  const sp0 = p.stats.speed;
  p.addBlessing(BLESSING_BY_ID.cafe_expresso);
  assert.ok(p.stats.speed > sp0, '+20% velocidade aplicado');
});

test('Cracha Dourado da +1 coracao maximo e cura junto', () => {
  const { p } = freshPlayer();
  const max0 = p.maxHp, hp0 = p.hp;
  p.addBlessing(BLESSING_BY_ID.cracha_dourado);
  assert.equal(p.maxHp, max0 + 1);
  assert.equal(p.hp, hp0 + 1, 'ganha o coracao cheio');
});

test('Caneca Termica faz o cafe curar 2', () => {
  const { p } = freshPlayer();
  p.hp = 1;
  assert.equal(p.stats.coffeeHeal, 1);
  p.addBlessing(BLESSING_BY_ID.caneca);
  assert.equal(p.stats.coffeeHeal, 2);
  p.heal(p.stats.coffeeHeal);
  assert.equal(p.hp, 3);
});

test('Pen Drive Dourado dobra a cadencia e adiciona perfuracao', () => {
  const { p } = freshPlayer();
  const rate0 = p.stats.fireRate, pierce0 = p.stats.pierce;
  p.addBlessing(BLESSING_BY_ID.pendrive);
  assert.equal(p.stats.fireRate, rate0 * 0.5);
  assert.equal(p.stats.pierce, pierce0 + 1);
});

test('Grampo de Cabelo da uma carga extra de dash', () => {
  const { p } = freshPlayer();
  p.addBlessing(BLESSING_BY_ID.grampo);
  assert.equal(p.stats.dashCharges, 2);
  assert.equal(p.dashCharges, 2);
});

test('Crachá de Vendas aumenta dano contra elites', () => {
  const { game, p } = freshPlayer();
  const elite = game.spawnEnemy('bug_elite', p.x + 50, p.y, {});
  const before = game.combat.hitEnemy(elite, 10, { noCrit: true }).damage;
  p.addBlessing(BLESSING_BY_ID.cracha_vendas);
  const elite2 = game.spawnEnemy('bug_elite', p.x + 70, p.y, {});
  const after = game.combat.hitEnemy(elite2, 10, { noCrit: true }).damage;
  assert.ok(after > before, `dano em elite subiu (${before} -> ${after})`);
});

test('bencaos sao registradas para a UI e a galeria', () => {
  const { p } = freshPlayer();
  p.addBlessing(BLESSING_BY_ID.postit);
  assert.equal(p.stats.blessings.length, 1);
  assert.equal(p.stats.blessings[0].id, 'postit');
  assert.equal(p.stats.revealAdjacent, true);
});

test('rollBlessings respeita raridade aproximada (60/30/10)', () => {
  const rng = new RNG(2024);
  const counts = { common: 0, rare: 0, legendary: 0 };
  const N = 3000;
  for (let i = 0; i < N; i++) {
    const [b] = rollBlessings(rng, 1, []);
    counts[b.rarity]++;
  }
  assert.ok(counts.common / N > 0.5 && counts.common / N < 0.7, 'comum ~60%: ' + counts.common / N);
  assert.ok(counts.rare / N > 0.2 && counts.rare / N < 0.4, 'rara ~30%: ' + counts.rare / N);
  assert.ok(counts.legendary / N > 0.03 && counts.legendary / N < 0.2, 'lendaria ~10%: ' + counts.legendary / N);
});

test('rollBlessings nunca repete bencao ja possuida', () => {
  const rng = new RNG(9);
  const owned = BLESSINGS.slice(0, BLESSINGS.length - 2).map(b => b.id);
  const out = rollBlessings(rng, 3, owned);
  for (const b of out) assert.ok(!owned.includes(b.id), b.id + ' repetida');
  assert.ok(out.length <= 2, 'so sobraram 2 opcoes');
});

test('todas as bencaos tem id unico, raridade valida e apply()', () => {
  const ids = new Set();
  for (const b of BLESSINGS) {
    assert.ok(!ids.has(b.id), 'id duplicado: ' + b.id);
    ids.add(b.id);
    assert.ok(['common', 'rare', 'legendary'].includes(b.rarity), b.id + ' raridade invalida');
    assert.equal(typeof b.apply, 'function', b.id + ' sem apply()');
    assert.ok(b.name && b.desc, b.id + ' sem nome/descricao');
  }
  assert.ok(BLESSINGS.length >= 20, 'pelo menos 20 bencaos');
});

test('todas as bencaos aplicam sem quebrar os stats', () => {
  for (const b of BLESSINGS) {
    const { p } = freshPlayer();
    p.addBlessing(b);
    for (const [k, v] of Object.entries(p.stats)) {
      if (typeof v === 'number') {
        assert.ok(Number.isFinite(v), `${b.id} deixou ${k} invalido (${v})`);
        assert.ok(v >= 0, `${b.id} deixou ${k} negativo`);
      }
    }
    assert.ok(p.maxHp >= 1 && p.maxHp <= 20, b.id + ' maxHp absurdo: ' + p.maxHp);
  }
});

test('personagens tem stats diferentes e itens iniciais validos', () => {
  for (const ch of CHARACTERS) {
    const { p } = freshPlayer(ch.id);
    assert.ok(p.stats.maxHp >= 2, ch.id + ' com vida baixa demais');
    assert.ok(ITEMS[p.activeItem], ch.id + ' item inicial inexistente');
  }
  const bia = freshPlayer('bia');
  const ze = freshPlayer('ze');
  assert.ok(bia.p.stats.speed > ze.p.stats.speed, 'Bia mais rapida que Seu Ze');
  assert.ok(ze.p.maxHp > bia.p.maxHp, 'Seu Ze com mais vida que Bia');
  assert.ok(freshPlayer('tonho').p.stats.damage > freshPlayer('max').p.stats.damage, 'Tonho bate mais forte');
});
