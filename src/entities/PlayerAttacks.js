/**
 * PlayerAttacks.js — ataques do Max, extraidos do Player.js para manter cada
 * arquivo abaixo de 400 linhas (regra do projeto).
 *  - playerFire: ataque primario (clipes, rajada, leque conforme bencaos)
 *  - playerUseSecondary: efeito unico do item ativo equipado
 */
import { PLAYER } from '../data/constants.js';
import { ITEMS } from '../data/items.js';


export function playerFire(player, game) {
  const stats = player.stats;
  player.fireCooldown = PLAYER.clipCooldown * stats.fireRate * (game.input.down('fire') ? 1 : 1.25);
  player.attackAnim = 0.2;
  const shots = stats.shots;
  const spread = shots > 1 ? 0.18 : PLAYER.clipSpread;
  for (let i = 0; i < shots; i++) {
    const off = shots === 1 ? game.rng.range(-spread, spread) : (i - (shots - 1) / 2) * spread;
    const ang = player.aimAngle + off;
    game.spawnProjectile({
      kind: 'clip', x: player.x + Math.cos(ang) * 8, y: player.y + Math.sin(ang) * 8,
      angle: ang, speed: PLAYER.clipSpeed * stats.projSpeed,
      damage: stats.clipDamage, from: 'player', pierce: stats.pierce,
    });
  }
  game.fx.burst(player.x + Math.cos(player.aimAngle) * 10, player.y + Math.sin(player.aimAngle) * 10, 'spark',
    { dir: player.aimAngle, spread: 0.7, count: 2 });
  game.audio.sfx('clip');
  game.camera.addShake(0.6);
  }

  /** Ataque secundario: efeito unico do item ativo. */
export function playerUseSecondary(player, game) {
  const item = ITEMS[player.activeItem];
  if (!item) return;
  player.secondaryCooldown = item.cooldown;
  const p = item.props || {};
  const ang = player.aimAngle;
  switch (item.kind) {
    case 'shotgun': {
      for (let i = 0; i < p.count; i++) {
        const a = ang + (i - (p.count - 1) / 2) * (p.spread / p.count);
        game.spawnProjectile({
          kind: p.projectile, x: player.x + Math.cos(a) * 8, y: player.y + Math.sin(a) * 8,
          angle: a, speed: p.speed, damage: p.dmg, from: 'player', life: p.range / p.speed,
        });
      }
      game.fx.slash(player.x, player.y, ang, 20, '#b0bec5');
      game.camera.addShake(2.5);
      game.audio.sfx('staple');
      break;
    }
    case 'melee': {
      const hitX = player.x + Math.cos(ang) * p.length * 0.5;
      const hitY = player.y + Math.sin(ang) * p.length * 0.5;
      game.meleeSwing(player, hitX, hitY, p.length, p.arc, p.dmg, ang, p.knockback);
      game.fx.slash(player.x, player.y, ang, p.length, '#ffffff');
      game.audio.sfx('staple');
      break;
    }
    case 'beam': {
      game.beamAttack(player, ang, p.length, p.width, p.dmg);
      game.audio.sfx('print');
      break;
    }
    case 'chain': {
      game.chainAttack(player, p.range, p.jumps, p.dmg, p.stun, ang);
      game.audio.sfx('cable');
      break;
    }
    case 'pool': {
      game.spawnProjectile({
        kind: p.projectile || 'coffeeProj', x: player.x + Math.cos(ang) * 8, y: player.y + Math.sin(ang) * 8,
        angle: ang, speed: 190, damage: p.dmg, from: 'player', onHitGround: 'coffeePool',
        poolDmg: p.poolDmg, poolTime: p.poolTime, radius: p.radius,
      });
      game.audio.sfx('coffee');
      break;
    }
    case 'slide': {
      for (let i = 0; i < p.count; i++) {
        game.spawnProjectile({
          kind: 'slide', x: player.x, y: player.y, angle: ang,
          speed: p.speed * (1 + i * 0.12), damage: p.dmg, from: 'player', pierce: 99,
          scale: 1 + i * 0.2,
        });
      }
      game.audio.sfx('print');
      game.camera.addShake(2);
      break;
    }
    case 'heal': {
      if (player.heal(p.heal) > 0) game.audio.sfx('heal');
      else game.fx.text(player.x, player.y - 14, 'VIDA CHEIA', '#8f8fa3');
      break;
    }
    case 'buff': {
      player.stats.furyTimer = p.buff;
      game.fx.banner('FÚRIA! +50% DANO', '#ff5252', 1.6, 40);
      game.audio.sfx('execute');
      break;
    }
  }
  game.audio.sfx('click');
  }

