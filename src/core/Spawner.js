/**
 * Spawner.js — fabricas de entidades do jogo: inimigos comuns (com a ficha
 * escalada pelo andar), chefes, projeteis, hazards e pickups de drop.
 * Extraido do Game.js para manter os arquivos abaixo de 400 linhas.
 */
import { floorScale } from '../data/constants.js';
import { scaleEnemy } from '../data/enemies.js';
import { ENEMY_CLASSES } from '../entities/enemies/index.js';
import { BOSS_CLASSES } from '../entities/bosses/index.js';
import { Pickup, rollDrops } from '../entities/Pickup.js';

/** Ficha do inimigo ja escalada pela dificuldade do andar. */
export function scaledEnemyDef(game, key) {
  const scale = game.floorScale || floorScale(game.floorN);
  return scaleEnemy(key, scale);
}

/** Cria um inimigo comum e o coloca na sala atual. */
export function spawnEnemy(game, key, x, y, opts = {}) {
  const def = scaledEnemyDef(game, key);
  const Cls = ENEMY_CLASSES[key] || ENEMY_CLASSES.papel;
  let enemy;
  if (key === 'formulario') {
    // formularios passam a geracao para as copias ficarem mais fracas
    const Formulario = ENEMY_CLASSES.formulario;
    enemy = new Formulario(x, y, def, opts.generation || 0);
  } else {
    enemy = new Cls(x, y, def);
  }
  enemy.hp = enemy.maxHp = opts.hp ?? def.hp;
  game.room.entities.push(enemy);
  game.fx.ring(x, y, 2, 12, '#ff8fa3', 0.25, 1);
  return enemy;
}

/** Solta um pickup na sala. */
export function spawnPickup(game, kind, x, y, opts = {}) {
  const p = new Pickup(kind, x, y, opts);
  game.pickups.push(p);
  return p;
}

/** Cria o chefe do andar (mini-chefe ou CEO) com a arena preparada. */
export function spawnBoss(game, type, player) {
  const id = game.floorData.boss;
  const Cls = BOSS_CLASSES[id];
  if (!Cls) return null;
  const x = game.room.w / 2, y = game.room.h * 0.32;
  // chefes NAO usam a escala do andar: o HP de cada um ja foi balanceado para o
  // proprio andar (com a escala cheia o CEO virava um saco de pancadas)
  const bossScale = { hp: 1, damage: 1, speed: 1, coins: 1 };
  const boss = new Cls(x, y, bossScale);
  boss.game = game;
  game.room.entities.push(boss);
  game.room.boss = boss;
  game.boss = boss;
  boss.start(game);
  game.camera.targetZoom = 0.85;
  // props destrutiveis da arena aguentam mais pancada
  for (const prop of game.room.props) prop.hp *= 1.4;
  return boss;
}

export { rollDrops };
